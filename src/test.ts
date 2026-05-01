import type { TestConvex } from "convex-test";
import schema from "./component/schema.js";

declare global {
  interface ImportMeta {
    glob(pattern: string): Record<string, () => Promise<unknown>>;
  }
}

const modules = import.meta.glob("./component/**/*.ts");

export function register(t: TestConvex<any>, name = "daytona") {
  t.registerComponent(name, schema, modules);
}

export default { modules, register, schema };
