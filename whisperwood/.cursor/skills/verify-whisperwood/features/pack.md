# Pack

The pack shows the rod in hand, coins, and bait on the hook. Closing it writes the save.

## Sub-features

- `pack-open` opens the pack from the keyboard once the vale is playing.
- `pack-starter` shows the fresh-origin rod, coins, and worm count.
- `pack-close` hides the pack and writes `whisperwood-save-v1`.

## How to get to it (user POV)

- While playing, press `I`.
- Press `I` again, or `Esc`, to close it.
- The on-screen hint reads `J Journal · I Pack`.

## Driving it with the Cursor browser

Preconditions:

- `vale-verify.js doctor` prints `status ok`.
- The play page is past the start screen. If the snapshot shows `Paused`, choose `Keep fishing` first.
- Fresh origin only for the starter counts: the start button on this origin said `Enter the Vale` before play, and `localStorage.getItem('whisperwood-save-v1')` was null before the pack was opened.

- **Open.** Press `I`. Run `browser_press_key` with `key` `i`. The visibility JSON has `pack` `open` and `start` `closed`. On a fresh origin the screenshot and snapshot show `Willow Rod`, `12 coins`, and `Worms ×8`.
- **Proof of the open panel.** Run `browser_snapshot` and `browser_take_screenshot` with `filename` `pack-open.png`. Write the snapshot to `open.aria.txt` and the visibility JSON to `open.json`. Copy the image with `vale-verify.js keep pack pack-open.png <screenshot-file>`.
- **Close and confirm the save.** Press `I` again. Run `browser_press_key` with `key` `i`. The visibility JSON has `pack` `closed`. Read `whisperwood-save-v1` with `Runtime.evaluate` as in the journal recipe. Write it to `save.json`. On a fresh origin `player.coins` is 12, `inventory.rodId` is `willow`, `inventory.equippedBait` is `worms`, and `inventory.bait.worms` is 8. `proof.txt` records entry point `I`.

## Gotchas

- Pressing `I` while the start screen is visible starts the vale and does not open the pack.
- Number keys `1` through `5` equip bait only while the pack is open. Do not press them during this proof.
- `Esc` while the pack is open closes it instead of opening pause.
- A reused origin can hold a later rod or bait pile. Do not assert `Willow Rod` or `12 coins` unless the fresh-origin precondition held.
- The snapshot lists heading `Pack` while the pack is closed. `pack: open` in the visibility JSON, plus the screenshot, is the open proof.
- Mute, copy save, and paste save live in this panel too. This recipe does not prove them.
