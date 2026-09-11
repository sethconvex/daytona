import { DatabaseSync } from "node:sqlite";

/** One service process per database. Persist the DB and enable disk encryption. */
export class Store {
  private db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;",
    );
    this.db.exec(`CREATE TABLE IF NOT EXISTS objects (
      tenant TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
      PRIMARY KEY (tenant, kind, id)
    )`);
    this.db.exec(
      "CREATE INDEX IF NOT EXISTS objects_status ON objects(kind, json_extract(data, '$.status'));",
    );
    this.db.exec(
      "CREATE INDEX IF NOT EXISTS run_workspace_status ON objects(tenant, kind, json_extract(data, '$.workspaceId'), json_extract(data, '$.status'));",
    );
  }
  get<T>(tenant: string, kind: string, id: string): T | null {
    const row = this.db
      .prepare("SELECT data FROM objects WHERE tenant=? AND kind=? AND id=?")
      .get(tenant, kind, id);
    return row ? (JSON.parse(String(row.data)) as T) : null;
  }
  put(tenant: string, kind: string, id: string, value: unknown) {
    this.db
      .prepare(
        "INSERT INTO objects VALUES (?, ?, ?, ?) ON CONFLICT(tenant,kind,id) DO UPDATE SET data=excluded.data",
      )
      .run(tenant, kind, id, JSON.stringify(value));
  }
  list<T>(
    kind: string,
    after = "",
    limit = 100,
    activeOnly = false,
  ): Array<{ tenant: string; id: string; data: T; cursor: string }> {
    const active = activeOnly
      ? " AND json_extract(data, '$.status') IN ('queued','running')"
      : "";
    return this.db
      .prepare(
        "SELECT tenant,id,data FROM objects WHERE kind=? AND (tenant || ':' || id)>?" +
          active +
          " ORDER BY tenant || ':' || id LIMIT ?",
      )
      .all(kind, after, limit)
      .map((row) => ({
        tenant: String(row.tenant),
        id: String(row.id),
        data: JSON.parse(String(row.data)),
        cursor: `${row.tenant}:${row.id}`,
      }));
  }
  hasActiveRun(tenant: string, workspaceId: string) {
    return Boolean(
      this.db
        .prepare(
          "SELECT id FROM objects WHERE tenant=? AND kind='run' AND json_extract(data, '$.workspaceId')=? AND json_extract(data, '$.status') IN ('queued','running') LIMIT 1",
        )
        .get(tenant, workspaceId),
    );
  }
  close() {
    this.db.close();
  }
}
