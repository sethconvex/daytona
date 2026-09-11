import type { Job } from "../sandbox/types.js";
import { durationMs } from "../sandbox/types.js";

export function runDirectory(runId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error("Invalid run ID.");
  return `/tmp/convex-sandbox/${runId}`;
}
export function supervisor(runId: string, job: Job): string {
  const payload = Buffer.from(
    JSON.stringify({
      root: runDirectory(runId),
      command: job.command,
      cwd: job.cwd ?? "/workspace",
      env: job.env ?? {},
      timeout: durationMs(job.timeout ?? "1h") / 1000,
    }),
  ).toString("base64");
  return `import os, json, base64, subprocess, time, signal, fcntl
p = json.loads(base64.b64decode('${payload}'))
root = p['root']
os.makedirs(root, exist_ok=True)
lock = open(root + '/lock', 'a')
try:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
except BlockingIOError:
    raise SystemExit(0)
# A completed or previously accepted run must never execute a second time.
if os.path.exists(root + '/result.json'):
    raise SystemExit(0)
if os.path.exists(root + '/started'):
    result = {'status':'failed','exitCode':None,'durationMs':0,'error':'Supervisor lost after acceptance; command was not retried.'}
else:
    started = time.monotonic()
    open(root + '/started', 'x').close()
    if os.path.exists(root + '/cancel'):
        result = {'status':'cancelled','exitCode':None,'durationMs':0}
    else:
        child = None
        try:
            with open(root + '/stdout', 'wb') as out, open(root + '/stderr', 'wb') as err:
                child = subprocess.Popen(p['command'], cwd=p['cwd'], env={**os.environ, **p['env']}, stdout=out, stderr=err, start_new_session=True)
                status = 'exited'
                while child.poll() is None:
                    if os.path.exists(root + '/cancel'):
                        status = 'cancelled'
                    elif time.monotonic() - started >= p['timeout']:
                        status = 'timedOut'
                    if status != 'exited':
                        try: os.killpg(child.pid, signal.SIGKILL)
                        except ProcessLookupError: pass
                        child.wait()
                        break
                    time.sleep(0.2)
                # Do not leave descendants running after the top-level process exits.
                try: os.killpg(child.pid, signal.SIGKILL)
                except ProcessLookupError: pass
                result = {'status':status,'exitCode':child.returncode if status == 'exited' else None,'durationMs':int((time.monotonic()-started)*1000)}
        except Exception as error:
            if child is not None:
                try: os.killpg(child.pid, signal.SIGKILL)
                except ProcessLookupError: pass
                child.wait()
            result = {'status':'failed','exitCode':None,'durationMs':int((time.monotonic()-started)*1000),'error':str(error)}
with open(root + '/result.tmp', 'w') as output:
    json.dump(result, output)
os.replace(root + '/result.tmp', root + '/result.json')
`;
}
export function quote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
