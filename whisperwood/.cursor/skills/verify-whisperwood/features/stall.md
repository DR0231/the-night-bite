# Stall

Talking to Wren opens the stall. Buying worms spends coins and adds bait.

## Sub-features

- `stall-talk` walks until the prompt is `Press E to talk to Wren` and E opens `#shop`.
- `stall-buy` clicks the worms row `[data-buy="bait:worms"]`.
- `stall-save` shows `player.coins` lower and `inventory.bait` higher after the stall closes.

## How to get to it (user POV)

- Enter the vale and walk to Wren.
- Press E. The stall panel opens.
- Buy worms, then close the stall. Coins go down and the bait pile goes up.

## Driving it with the Cursor browser

Preconditions:

- A fresh `VALE_VERIFY_RUN`. `vale-verify.js doctor` prints `status ok`.
- The play page is past the start screen. Viewport 1280×720.
- Install the page-error listeners from the cast-fight recipe before the walk.

- **Walk.** Hold `ArrowRight` (or `d`) and poll `#prompt` until its text is exactly `Press E to talk to Wren`. Release when it matches. If the player is blocked, step `ArrowUp` or `ArrowDown`, then hold right again. Wren wanders a few steps; the prompt is the arrival test.
- **Open.** Wait until `#catch-toast` has class `hidden`. Press `e`. Visibility of `#shop` is `open` (`getComputedStyle` display is not `none`). The heading reads `Wren’s stall`.
- **Before.** Read `localStorage` key `whisperwood-save-v1` and keep it as `save-before.json`. Record `player.coins` and `inventory.bait.worms`.
- **Buy.** Snapshot, then `browser_click` the button whose `data-buy` is `bait:worms` (accessible name starts with `Worms`). Confirm the clicked element with a DOM read of `dataset.buy`, not by calling `Shop.buy`.
- **Close.** Click the `Close` button inside `#shop` (`button[data-close]`). `#shop` is `closed`. Wait until `#catch-toast` is hidden.
- **After.** Read `whisperwood-save-v1` again. `player.coins` is lower than the before value. `inventory.bait.worms` is higher. Keep this string as `save.json`. `window.__valeErrors` is empty.
- **Evidence.** Screenshot `stall-buy.png` via `vale-verify.js keep stall`. `proof.txt` records the coin drop and the bait rise.

## Gotchas

- The stall is `#shop`. Wren does not open `#dialog` for this talk.
- Compare the save before and after. Do not hard-code 12 coins or 8 worms; a fresh origin has those, and the proof is a drop and a rise.
- The worms row costs 4 coins. If that button is disabled, stop and report the coin count. Do not click another row to force a pass.
- Bought bait equips only when the hook was empty. This recipe does not assert the equipped bait.
- Do not click `Give a duplicate fish`.
- Wait for the toast to hide before reading the after-save so a queued note is not mistaken for a failed close.
