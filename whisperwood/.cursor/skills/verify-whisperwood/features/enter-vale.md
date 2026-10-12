# Enter the vale

Enter the vale dismisses the start screen and shows the playing HUD: the valley canvas, the clock, and the region card.

## Sub-features

- `enter-button` starts from the button on the start screen.
- `enter-key` starts from a keypress while the start screen is up.
- `enter-hud` shows the clock and region once the start screen is gone.

## How to get to it (user POV)

- On `play.html`, choose `Enter the Vale` on a first visit, or `Return to the Vale` when this origin already has a save.
- Press any movement or action key while the start screen is still up. `Space`, `E`, and `Enter` are the keys the start screen documents for play.

## Driving it with the Cursor browser

Preconditions:

- `vale-verify.js doctor` prints `status ok`.
- The Cursor browser tab is that `url` and has not been driven yet this proof.
- The snapshot shows a button named `Enter the Vale` or `Return to the Vale`, and does not show `Boot failed` or `Retry boot`.

- **Button entry.** Choose the start button. Run `browser_snapshot`, then `browser_click` on the ref whose name is `Enter the Vale` or `Return to the Vale` (`#btn-start`). The visibility JSON has `start` `closed`. `phase` is `Dawn`, `season` is `Spring`, and `rank` is `Rank 1`. `weather` is one of `Clear`, `Rain`, `Mist`, `Heat`, or `Frost`.
- **HUD proof.** Capture that HUD before opening another panel. Run `browser_snapshot` and `browser_take_screenshot` with `filename` `enter-hud.png`. Save the snapshot as `hud.aria.txt` and the visibility JSON as `hud.json`. Copy the image with `vale-verify.js keep enter-vale enter-hud.png <screenshot-file>`. `proof.txt` records entry point `enter-button`.
- **Key entry.** Use a different `VALE_VERIFY_RUN` so the origin still shows the start screen. Load `play.html`, then `browser_press_key` with `key` `Enter`. Visibility JSON `start` is `closed`, and `phase`, `season`, and `rank` match the button entry. Do not use this run's origin if the button already said `Return to the Vale`.

## Gotchas

- Any aliased key while visibility JSON `start` is `open` calls the same start path as the button. Do not press `j`, `i`, or `Escape` to open a panel until `start` is `closed`.
- After the HUD is up, blurring the window opens the pause menu. If `pause` is `open` immediately after enter, choose `Keep fishing` before treating the HUD as settled.
- Time moves once the start screen is gone (`DAY_LENGTH` is 330 seconds). Assert `Dawn`, `Spring`, and `Rank 1`, not a later minute.
- Boot calls `Weather.rollDay()`, so a fresh origin is often not Clear. Read `weather` from the visibility JSON.
- The start screen and the region card both use the heading `Whisperwood Vale`. The start screen is gone only when visibility JSON `start` is `closed`.
- The snapshot can keep the start-screen copy after it is hidden. Trust `start` in the visibility JSON and the screenshot.
- A reused port keeps this browser profile's `localStorage`. The button then reads `Return to the Vale` even after the server process was cleaned up.
