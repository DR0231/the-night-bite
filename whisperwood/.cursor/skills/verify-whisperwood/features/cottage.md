# Cottage

Inside the cottage, the bench, wall mount, and mail tray open their panels, the tank on a fresh origin only toasts, and the bed sleeps without an overlay. The clock stays put while a panel is open.

## Sub-features

- `cottage-bench` opens `#bench` from the packing bench.
- `cottage-trophy` opens `#trophy` from the wall mount.
- `cottage-mail` opens `#mail`. A fresh origin shows `The tray is empty.`
- `cottage-tank` toasts `Catch a fish to keep.` and opens no panel.
- `cottage-bed` sleeps from a prompt that starts with `Press E to sleep`, then wakes. Esc is never pressed during sleep.
- `cottage-clock` reads the same minute, or one minute later, while `#bench`, `#trophy`, and `#mail` are open.

## How to get to it (user POV)

- Stand at the packing bench and press E. The bench panel opens.
- Stand at the wall mount and press E. The mount panel opens.
- Stand at the mail tray and press E. The tray is empty until a later day brings a letter.
- Stand at the tank and press E. With nothing to keep, a note says to catch a fish.
- Stand at the bed and press E. The fisher sleeps, then wakes. Leave the keyboard alone until morning or evening.

## Driving it with the Cursor browser

Preconditions:

- A fresh `VALE_VERIFY_RUN`. `vale-verify.js doctor` prints `status ok`. Viewport 1280×720.
- Enter the vale once so a save exists. Install the page-error listeners after every reload (a reload clears them).

Seed each spot the same way. One run, one paste per spot. Before every paste, `vale-verify.js keep cottage save-before-<spot>.json` of the current `whisperwood-save-v1`. There is no restore step.

1. Press `Escape` so `#pause-menu` is open. If another panel is open, `Escape` closes that panel first; press `Escape` again.
2. Scroll `#btn-import` into view and click `Paste save`.
3. Read the current save, set `player.map` to `"cottage"`, and set `player.x`, `player.y`, and `player.dir` from the table. Leave every other field as it was.
4. `browser_fill` `#paste-save-text` with that JSON. Click `#paste-save-btn` (`Load this save`). The page reloads.
5. Wait for the start button, then click it (`Return to the Vale`). Wait until `#catch-toast` is hidden before pressing E.

| Spot | x | y | dir | Prompt starts with |
| --- | --- | --- | --- | --- |
| bench | 88 | 188 | 3 | `Press E — packing bench` |
| trophy | 176 | 72 | 3 | `Press E to manage the wall mount` |
| mail | 200 | 190 | 3 | `Press E to check the mail tray` |
| tank | 256 | 100 | 3 | (no prompt required) |
| bed | 115.2 | 124 | 3 | `Press E to sleep` |

If the prompt is wrong after enter, hold a direction key and poll `#prompt` until it matches. Do not call a settle function.

- **Bench.** Press `e`. `#bench` is open. Read `#clock-text`, then poll for about two seconds of frames. The clock text matches or is one displayed minute later. Click `Close`. Screenshot `bench.png`.
- **Trophy.** Same, for `#trophy`. Screenshot `trophy.png`.
- **Mail.** `#mail` is open. Its visible text (`innerText`, not `innerHTML`) contains `The tray is empty.` Do not look for a read state. Clock check as above. Screenshot `mail.png`.
- **Tank.** Press `e`. Wait until `#catch-toast` is visible and its text is `Catch a fish to keep.` No cottage panel opens (`#bench`, `#trophy`, `#mail`, `#board` stay closed). There is no tank overlay to open on this save.
- **Bed, last.** `#prompt` text starts with `Press E to sleep`. Press `e` once. Do not press `Escape`. Do not press E again. Poll until `#catch-toast` text is `You slept until dawn.` or `You slept until dusk.` The clock is not frozen during sleep; do not apply the one-minute check here.
- **Errors.** `window.__valeErrors` is empty. `proof.txt` names each spot.

## Gotchas

- Letters appear on a returning-day save. This recipe uses a fresh origin and only proves the empty tray.
- The tank prompt appears only when a fish can be kept. On a fresh origin the proof is the toast, not a prompt and not an overlay.
- Sleep is not a panel. `Escape` during sleep is out of the recipe. Run the bed last so an earlier paste is not asked to sleep twice.
- Overlapping furniture uses the first match. Use the coordinates in the table. A wrong prompt means step and poll, then press E only when the line matches (except the tank).
- Match panel copy with `innerText`. A label wrapped in `strong` still reads as plain words.
- The clock may tick one minute that was already in flight when the panel opened. A second minute means it was not frozen.
