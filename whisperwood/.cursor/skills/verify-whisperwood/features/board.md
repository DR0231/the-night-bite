# Forecast board

The cottage calendar opens the daily board. The board is not in the vale. Its visible text names today, the rumor, and the forecast.

## Sub-features

- `board-open` stands at the calendar until the prompt is `Press E to read the forecast board`, then E opens `#board`.
- `board-copy` shows `Today —`, `Rumor —`, and `Forecast —` in the panel's visible text.
- `board-clock` keeps the clock still, within one minute, while `#board` is open.

## How to get to it (user POV)

- Inside the cottage, stand at the forecast board and press E.
- Read today's line, the rumor, and the forecast.
- Close the board and return to the room.

## Driving it with the Cursor browser

Preconditions:

- A fresh `VALE_VERIFY_RUN`. `vale-verify.js doctor` prints `status ok`. Viewport 1280×720.
- Enter the vale once. Install the page-error listeners after every reload.

Seed with the cottage paste path. Before the paste, keep the current `whisperwood-save-v1` as `save-before.json`. Set `player.map` to `"cottage"`, `player.x` to `250`, `player.y` to `176`, `player.dir` to `3`. Fill `#paste-save-text`, click `#paste-save-btn`, and after reload click the start button. This spot is the cottage calendar, not a board in the vale.

- **Arrive.** `#prompt` text is `Press E to read the forecast board`. If it is not, hold a direction and poll until it is. Wait until `#catch-toast` is hidden.
- **Open.** Press `e`. `#board` is open. The heading is `Daily board`.
- **Copy.** Read `#board` with `innerText`. The string contains `Today —`, `Rumor —`, and `Forecast —`. Do not match on `innerHTML`; the labels sit inside `strong`.
- **Clock.** Read `#clock-text` after the panel is open. Poll for about two seconds of frames. The text matches or is one displayed minute later.
- **Close.** Click `Close` in `#board`. `#board` is closed. `window.__valeErrors` is empty.
- **Evidence.** Screenshot `board-open.png` via `vale-verify.js keep board`. Save `innerText` as `board.txt` and the visibility JSON as `open.json`.

## Gotchas

- The vale has no forecast board. Seeding onto the cottage calendar is the path. Do not walk the crossroads looking for `#board`.
- The forecast sentence changes with the day. Assert the three labels, not a particular weather word.
- A finished board still uses those labels. Do not require `Today’s board is done.`
- One in-flight minute on the clock is allowed. A second minute fails the freeze check.
