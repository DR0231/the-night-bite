---
name: verify-whisperwood
description: "Drive Whisperwood Vale's web game the way a player does — play.html menus and the guide page — on an isolated static server. Use when proving a play, journal, pack, pause, save, or guide change, or when asked to verify the vale in a browser."
---

# Verify Whisperwood Vale

Whisperwood Vale's primary surface is the web game. `play.html` is a canvas valley plus DOM panels. `index.html` and `guide.html` are the public site. The desktop Electron app is a second surface: it takes a single-instance lock and stores the player's save under `%APPDATA%\Whisperwood Vale`. Do not launch it for verification.

The harness is `node .cursor/skills/verify-whisperwood/scripts/vale-verify.js` plus the Cursor IDE browser tools (`browser_navigate`, `browser_lock`, `browser_snapshot`, `browser_click`, `browser_press_key`, `browser_take_screenshot`, `browser_cdp`). Feature recipes live in `features/`. Read `features/README.md` before driving, then follow the matching feature file. A proof that uses one entry point does not cover the others.

## Launch

From the repo root:

```
node .cursor/skills/verify-whisperwood/scripts/vale-verify.js launch
```

That starts `node serve.js` with `PORT` set to a free port from 18765 upward. It never binds 8765, the port `serve.js` uses when `PORT` is unset, so a verification run does not attach to a server the player started. Ready means `http://127.0.0.1:<port>/play.html` returns 200 and the body contains `id="btn-start"`, `id="game"`, and `Whisperwood Vale`. The command prints `status listening` or `status already-running`, plus `url`, `pid`, `port`, and `evidence`.

`VALE_VERIFY_RUN` selects the state id (default `default`). Two run ids use two ports. Each port is its own browser origin, so `localStorage` does not cross runs. Re-running launch for a healthy id reuses that server.

`VALE_VERIFY_PORT` forces a port. The script refuses 8765 and a port that is already taken.

State and the server log live in the OS temp directory under `verify-whisperwood\`. They are not proof.

## Doctor

```
node .cursor/skills/verify-whisperwood/scripts/vale-verify.js doctor
```

Run this first whenever the page looks wrong. It is read-only. Exit 0 requires all of:

- a state file for this run id
- that pid is alive
- that pid's command line is this repo's `serve.js`
- `play.html` on the recorded port returns the vale markup above

Use the printed `url`. Do not drive any other port, and do not drive `app://` or an Electron window.

## Drive

Open the doctor `url` in a new Cursor browser tab (`browser_navigate` with `newTab: true`). Lock the browser (`browser_lock` `action: lock`) before clicks or keys, and unlock it when the proof is done.

Snapshots are the source of truth for what to click. `browser_click` needs the `ref` from the latest `browser_snapshot`. Prefer the accessible name (`Enter the Vale`, `Keep fishing`). Stable ids when a name is shared: `#btn-start`, `#pause-resume`, `#game`.

The snapshot still lists headings inside panels that use `display: none`. A heading such as `Fish Collection`, `Pack`, or `Paused` does not mean that panel is open. After every action, read visibility with `browser_cdp` method `Runtime.evaluate`, `returnByValue: true`, and this expression:

```
(() => {
  function vis(id) {
    const el = document.getElementById(id);
    if (!el) return "missing";
    return getComputedStyle(el).display === "none" ? "closed" : "open";
  }
  const text = (id) => (document.getElementById(id) || {}).textContent || "";
  return JSON.stringify({
    start: vis("start-screen"),
    journal: vis("journal"),
    pack: vis("pack"),
    pause: vis("pause-menu"),
    count: text("journal-count"),
    clock: text("clock-text"),
    phase: text("clock-phase"),
    season: text("clock-season"),
    weather: text("clock-weather"),
    rank: text("clock-rank"),
    startBtn: text("btn-start")
  });
})()
```

`open` means the player can see that panel. Require the feature file's `open` and `closed` values from this JSON, and match them to the screenshot.

Keys are `j` (journal), `i` (pack), and `Escape` (pause or close). The game listens on the window, so focus does not have to be on the canvas. Do not press those keys while the visibility JSON says `start` is `open`: any key starts the vale.

Read `localStorage` key `whisperwood-save-v1` with `browser_cdp` method `Runtime.evaluate` and params:

```
{ "expression": "localStorage.getItem('whisperwood-save-v1')", "returnByValue": true }
```

That is the save the game writes. Do not call `Save.write` or any admin command. F8 admin is not a guest path.

The starter map does not include casting, the stall, the cottage, or the daily board. Do not report those as verified.

## Evidence

Proof for a feature goes in the directory printed by:

```
node .cursor/skills/verify-whisperwood/scripts/vale-verify.js evidence <feature-id>
```

That is `artifacts/verify-whisperwood/<run-id>/<feature-id>/`. The directory is gitignored. Cleanup does not delete it.

For each proof, keep:

- the accessibility snapshot text after the action (`open.aria.txt` or the name the feature file gives)
- a screenshot taken with `browser_take_screenshot` (`filename` is a file name, not a directory). The tool prints `Saved to:` with the temp image path. Copy that file in with `vale-verify.js keep`. `browser_snapshot` `selector` still returns the whole page, so it is not a visibility test.
- the `localStorage` string when the feature writes a save (`save.json`)
- a one-line `proof.txt` naming the feature id, the entry point used, the doctor `url`, and what was observed

UI proof shows the action's result, not only the last screen. A save proof is the stored JSON, not the panel that closed. Do not treat the F8 panel, a console setter, or a hand-edited `localStorage` value as the user path.

```
node .cursor/skills/verify-whisperwood/scripts/vale-verify.js keep <feature-id> <dest-name> <source-file>
```

## Cleanup

```
node .cursor/skills/verify-whisperwood/scripts/vale-verify.js cleanup
```

This kills the pid recorded for this run, and only if that pid's command line is still this repo's `serve.js`. It does not kill by process name. It removes the temp state file and leaves the evidence directory. Running it with no state prints `status absent` and exits 0. Run it after a failed launch too, so a half-started pid is not left behind.

## Helpers

`vale-verify.js` is plain Node, the same runtime as `serve.js`. Invoke it from the repo root with the commands in the sections above. `evidence` prints the proof directory it created. `keep` copies one file into that directory and prints the destination.
