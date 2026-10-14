# Phone at 915

A short landscape phone shows coarse-pointer verbs: Fish while idle, Talk at Wren, Read at a sign, Fish at the water. A sign note shows the word Sign and wraps to at most three lines. The sundial says Read only after it has been bought.

## Sub-features

- `phone-coarse` reports `matchMedia('(pointer: coarse)')` true at 915×412.
- `phone-verbs` shows Fish while idle, Talk at Wren, Read at a sign, and Fish at the water.
- `phone-sign` taps Read and shows a note whose name is `Sign`, clamped to at most three lines.
- `phone-sundial` toasts `Buy a cottage sundial from Wren to hang here.` when the item is not owned. After buying `item:dayclock`, the button reads `Read`.

## How to get to it (user POV)

- On a phone, the corner button follows what E would do: Fish, Talk, or Read.
- Reading a sign shows a short note titled Sign.
- A blank nail asks for a sundial. Once Wren has sold one, that same button reads Read.

## Driving it with the Cursor browser

Preconditions:

- A fresh `VALE_VERIFY_RUN`. `doctor` prints `status ok`. Use only that url.
- Before `browser_navigate` to `play.html`, open `about:blank` and set device metrics. `browser_cdp` method `Emulation.setDeviceMetricsOverride` with params `{"width":915,"height":412,"deviceScaleFactor":3.5,"mobile":true}`. Then `Emulation.setTouchEmulationEnabled` with params `{"enabled":true,"maxTouchPoints":5}`.
- If either Emulation call is blocked, stop and use `scripts/phone-metrics.js` (see Gotchas). Do not invent a different size.
- After each load or reload, wait about 3 seconds, then tap the start button. Re-apply both Emulation calls at the start of a later turn, and reload if `innerWidth` is not 915.

- **Coarse.** After the wait, `matchMedia('(pointer: coarse)').matches` is true. Install the page-error listeners.
- **Fish, idle.** Enter the vale. `#btn-fish` text is `Fish`. Screenshot `fish-idle.png`.
- **Talk.** Seed or walk until the prompt is `Talk to Wren`. Seed: paste `player.map` `"vale"`, `x` `560`, `y` `429`, `dir` `2`, using the pause → `#btn-import` → `#paste-save-text` → `#paste-save-btn` path. Before that paste, keep the current save as `save-before-wren.json`. After reload, wait about 3 seconds, enter, and wait until `#catch-toast` is hidden. `#btn-fish` text is `Talk`.
- **Read.** Seed `x` `557`, `y` `422`, `dir` `3` on `vale` (the stall sign). Keep `save-before-sign.json` first. Wait for `#catch-toast` to be hidden. `#btn-fish` text is `Read`. Tap that button (pointer on `#btn-fish`). Poll until `#catch-toast` is visible, has class `note`, and `#toast-name` text is `Sign`. The clamped line (`#catch-toast .toast-inner > div:not(#toast-art)`) has `-webkit-line-clamp` `3` and its height is at most 48px. The word Sign is the full `textContent`, not a clipped fragment. Screenshot `sign-note.png`.
- **Fish, water.** Seed `x` `296`, `y` `400`, `dir` `3` on `vale` (Calm Pond dock). Keep `save-before-water.json` first. Prompt text is `Tap Fish to cast` and `#btn-fish` text is `Fish`. Do not cast.
- **Sundial.** Seed cottage `x` `227`, `y` `76`, `dir` `3`. Keep `save-before-nail.json` first. The prompt is `A blank nail. Wren sells a cottage sundial.` and the button is not `Read`. Tap it. The toast text is `Buy a cottage sundial from Wren to hang here.` A fresh origin has 12 coins and the sundial costs 22, so this origin stops on that toast.
- **Sundial after buy.** Only when the pasted save already has at least 22 coins: at Wren, tap `Talk`, click `[data-buy="item:dayclock"]`, close the stall, return to the nail, and assert `#btn-fish` is `Read`. Do not add coins except by pasting a save that already has them, and do not buy by calling `Shop.buy`.
- **Errors.** `window.__valeErrors` is empty. `proof.txt` records `pointer: coarse`, the four verbs, the sign clamp, and the sundial toast.

## Gotchas

- Touch emulation is not a phone. Haptics, safe area, and a real coarse pointer are outside this recipe.
- Device metrics last for the current turn. Set them again before the next navigation, then reload if the width is wrong.
- `Emulation.setTouchEmulationEnabled` with `enabled: false` must omit `maxTouchPoints`. A value of 0 is rejected.
- The 3 second wait is only the pause before tapping start. Arrival at Wren, the sign, and the water is still a prompt poll, not a timer.
- Sign notes hold about 9 seconds and may sit behind an onboarding note. Wait until the toast is hidden, tap Read, and if another note is showing, wait until the one named Sign is the visible note.
- Do not expect `Read` on the blank nail. That label follows a purchased `item:dayclock`.
- If either Emulation call is blocked, add `scripts/phone-metrics.js` that prints those two calls and the `matchMedia` check, then follow it. The helper must leave `launch`, `doctor`, `cleanup`, `evidence`, and `keep` unchanged.
