/* Launch, check, and stop an isolated Whisperwood Vale static server.
   node .cursor/skills/verify-whisperwood/scripts/vale-verify.js <launch|doctor|cleanup|evidence|keep>
   VALE_VERIFY_RUN   state id (default: default)
   VALE_VERIFY_PORT  port to bind (never 8765; omit to pick a free port)
*/
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const servePath = path.join(repoRoot, "serve.js");
const PLAYER_PORT = 8765;

function runId() {
  const id = process.env.VALE_VERIFY_RUN || "default";
  if (!/^[A-Za-z0-9._-]+$/.test(id)) {
    fail("VALE_VERIFY_RUN must be letters, numbers, dots, underscores, or hyphens");
  }
  return id;
}

function stateDir() {
  return path.join(os.tmpdir(), "verify-whisperwood");
}

function statePath(id) {
  return path.join(stateDir(), id + ".json");
}

function logPath(id) {
  return path.join(stateDir(), id + ".log");
}

function evidenceRoot(id) {
  return path.join(repoRoot, "artifacts", "verify-whisperwood", id);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function say(line) {
  console.log(line);
}

function readState(id) {
  const file = statePath(id);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return null;
  }
}

function writeState(id, state) {
  fs.mkdirSync(stateDir(), { recursive: true });
  fs.writeFileSync(statePath(id), JSON.stringify(state, null, 2));
}

function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

function commandLine(pid) {
  try {
    if (process.platform === "win32") {
      const out = execFileSync("powershell.exe", [
        "-NoProfile",
        "-Command",
        "(Get-CimInstance Win32_Process -Filter \"ProcessId=" + pid + "\").CommandLine",
      ], { encoding: "utf8" });
      return (out || "").trim();
    }
    return fs.readFileSync("/proc/" + pid + "/cmdline", "utf8").replace(/\0/g, " ").trim();
  } catch (e) {
    return "";
  }
}

function ownsServe(pid) {
  const line = commandLine(pid);
  if (!line) return false;
  const norm = line.replace(/\//g, "\\").toLowerCase();
  const needle = servePath.replace(/\//g, "\\").toLowerCase();
  return norm.includes(needle);
}

function get(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
    req.setTimeout(2000, () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", reject);
  });
}

function canBind(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen({ port: port, host: "0.0.0.0", exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function pickPort() {
  if (process.env.VALE_VERIFY_PORT) {
    const port = Number(process.env.VALE_VERIFY_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) fail("VALE_VERIFY_PORT is not a TCP port");
    if (port === PLAYER_PORT) fail("Refusing port " + PLAYER_PORT + ". That is the player's default server in serve.js.");
    if (!(await canBind(port))) fail("Port " + port + " is already in use");
    return port;
  }
  for (let port = 18765; port <= 18864; port += 1) {
    if (port === PLAYER_PORT) continue;
    if (await canBind(port)) return port;
  }
  fail("No free verification port between 18765 and 18864");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function urls(port) {
  const base = "http://127.0.0.1:" + port;
  return {
    base: base,
    play: base + "/play.html",
    guide: base + "/guide.html",
    home: base + "/index.html",
  };
}

function printInstance(state, status) {
  const page = urls(state.port);
  say("status " + status);
  say("run " + state.runId);
  say("pid " + state.pid);
  say("port " + state.port);
  say("url " + page.play);
  say("guide " + page.guide);
  say("home " + page.home);
  say("evidence " + evidenceRoot(state.runId));
}

async function pageReady(playUrl) {
  try {
    const res = await get(playUrl);
    return res.status === 200
      && res.body.includes('id="btn-start"')
      && res.body.includes("Whisperwood Vale")
      && res.body.includes('id="game"');
  } catch (e) {
    return false;
  }
}

async function inspect(id) {
  const state = readState(id);
  if (!state || !state.pid || !state.port) return { ok: false, reason: "no verification server for run " + id };
  if (state.servePath && path.resolve(state.servePath) !== servePath) {
    return { ok: false, reason: "state points at a different serve.js", state: state };
  }
  if (!alive(state.pid)) return { ok: false, reason: "pid " + state.pid + " is not running", state: state };
  if (!ownsServe(state.pid)) return { ok: false, reason: "pid " + state.pid + " is not this repo's serve.js", state: state };
  const playUrl = urls(state.port).play;
  if (!(await pageReady(playUrl))) return { ok: false, reason: "play.html is not answering on port " + state.port, state: state };
  return { ok: true, state: state };
}

async function launch() {
  if (!fs.existsSync(servePath)) fail("Missing " + servePath);
  const id = runId();
  const existing = await inspect(id);
  if (existing.ok) {
    printInstance(existing.state, "already-running");
    return;
  }
  const port = await pickPort();
  fs.mkdirSync(stateDir(), { recursive: true });
  const log = logPath(id);
  const logFd = fs.openSync(log, "a");
  const child = spawn(process.execPath, [servePath], {
    cwd: repoRoot,
    env: Object.assign({}, process.env, { PORT: String(port) }),
    detached: true,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true,
  });
  child.unref();
  fs.closeSync(logFd);
  const state = {
    pid: child.pid,
    port: port,
    runId: id,
    servePath: servePath,
    startedAt: new Date().toISOString(),
  };
  writeState(id, state);
  const playUrl = urls(port).play;
  for (let i = 0; i < 40; i += 1) {
    if (await pageReady(playUrl)) {
      printInstance(state, "listening");
      return;
    }
    if (!alive(child.pid)) break;
    await sleep(250);
  }
  const tail = fs.existsSync(log) ? fs.readFileSync(log, "utf8").slice(-800) : "";
  try { process.kill(child.pid); } catch (e) { /* already gone */ }
  fs.unlinkSync(statePath(id));
  fail("Server did not serve play.html on port " + port + (tail ? "\n" + tail : ""));
}

async function doctor() {
  const found = await inspect(runId());
  if (!found.ok) fail(found.reason);
  printInstance(found.state, "ok");
}

async function cleanup() {
  const id = runId();
  const state = readState(id);
  const evidence = evidenceRoot(id);
  if (!state) {
    say("status absent");
    say("run " + id);
    say("evidence " + evidence);
    return;
  }
  if (alive(state.pid)) {
    if (!ownsServe(state.pid)) {
      fail("Refusing to kill pid " + state.pid + ". Its command line is not " + servePath);
    }
    try {
      process.kill(state.pid);
    } catch (e) {
      fail("Could not stop pid " + state.pid + ": " + e.message);
    }
    for (let i = 0; i < 20; i += 1) {
      if (!alive(state.pid)) break;
      await sleep(100);
    }
    if (alive(state.pid)) fail("pid " + state.pid + " is still running");
  }
  fs.unlinkSync(statePath(id));
  say("status stopped");
  say("run " + id);
  say("pid " + state.pid);
  say("evidence " + evidence);
}

function evidenceCmd() {
  const feature = process.argv[3];
  if (!feature || !/^[a-z0-9-]+$/.test(feature)) fail("usage: vale-verify.js evidence <feature-id>");
  const dir = path.join(evidenceRoot(runId()), feature);
  fs.mkdirSync(dir, { recursive: true });
  say(dir);
}

function keepCmd() {
  const feature = process.argv[3];
  const destName = process.argv[4];
  const source = process.argv[5];
  if (!feature || !/^[a-z0-9-]+$/.test(feature) || !destName || !source) {
    fail("usage: vale-verify.js keep <feature-id> <dest-name> <source-file>");
  }
  if (destName !== path.basename(destName) || destName.includes("..")) fail("dest-name must be a file name");
  const dir = path.join(evidenceRoot(runId()), feature);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, destName);
  fs.copyFileSync(source, dest);
  say(dest);
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === "launch") await launch();
  else if (cmd === "doctor") await doctor();
  else if (cmd === "cleanup") await cleanup();
  else if (cmd === "evidence") evidenceCmd();
  else if (cmd === "keep") keepCmd();
  else fail("usage: vale-verify.js <launch|doctor|cleanup|evidence|keep>");
}

main().catch((err) => fail(err && err.message ? err.message : String(err)));
