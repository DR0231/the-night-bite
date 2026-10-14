# Cast and fight

A cast at Calm Pond aims, throws the line, and ends in a catch toast or a miss toast. The pond fight shows the bright-band line. The hook prompt is not part of this path.

## Sub-features

- `cast-arrive` stands where the prompt is exactly `Fish · Space or E`.
- `cast-fight` presses E to aim, presses E to cast, and sees `Tap E / Space in the bright band`.
- `cast-result` ends on a catch toast or a miss toast, with no page error.

## How to get to it (user POV)

- Enter the vale and walk west toward Calm Pond.
- When the prompt reads `Fish · Space or E`, press E to aim, then E again to cast.
- Leave the fight alone. The line comes back as a catch or a miss.

## Driving it with the Cursor browser

Preconditions:

- A fresh `VALE_VERIFY_RUN`. `vale-verify.js doctor` prints `status ok`.
- The play page is past the start screen on that url. Viewport 1280×720. Do not set device metrics.
- Before the first key, install page-error listeners with `Runtime.evaluate`: `window.__valeErrors = []; window.addEventListener("error", (e) => window.__valeErrors.push(String(e.message))); window.addEventListener("unhandledrejection", (e) => window.__valeErrors.push(String(e.reason)));`

- **Walk.** Hold `ArrowLeft` (or `a`). Poll `#prompt` text until it is exactly `Fish · Space or E`. Release the key when it matches. A timer is not arrival. If the player is blocked, release, hold `ArrowUp` or `ArrowDown` until the position changes, then hold `ArrowLeft` again. If `#prompt` or the visible `#catch-toast` text starts with `Water is close`, that is not the cast prompt: step toward the water and poll again.
- **Clear notes.** Wait until `#catch-toast` has class `hidden`. If it becomes visible again, wait until it is hidden once more. Onboarding notes can hold about 9 seconds.
- **Aim, then cast.** `browser_press_key` with `key` `e`. Poll `#prompt` until its text contains `aim`. Press `e` again. Do not press `Escape`.
- **Bright band.** Poll `#prompt` until its text is `Tap E / Space in the bright band`. Do not press E while that line is up. Do not look for a Hook verb or for `Press E / Space to hook!`.
- **Result.** Poll until `#catch-toast` is visible and its `.toast-kicker` text is `Miss`, `Caught!`, `First catch!`, or `New record`. `proof.txt` records that kicker. `window.__valeErrors` is empty.
- **Evidence.** `browser_take_screenshot` with `filename` `cast-result.png`. Copy it with `vale-verify.js keep cast-fight cast-result.png <screenshot-file>`. Save the last visibility JSON as `result.json`.

Read the prompt and the toast with `Runtime.evaluate` (`textContent` / `innerText`). Do not call game functions.

## Gotchas

- `Water is close…` is an onboarding note, not the cast prompt. The success line is exactly `Fish · Space or E`.
- Which fish lands, and whether the toast is a catch or a miss, is random. Either ending passes. Do not press E during the bright-band line to force a catch.
- The hook prompt is not reached on this path. Do not fail the recipe for never seeing it.
- `Esc` during the fight opens pause and cuts the cast short. Leave it up.
- A catch or miss toast is dropped while another note is still holding. Wait for `#catch-toast` to hide before the first E.
- `browser_press_key` is a tap. A walk is a `keydown` that stays down while `#prompt` is polled, then a `keyup`. Do not call `Player` or write coordinates except through the paste path, and this recipe does not paste.
