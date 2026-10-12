# Journal

The journal lists every fish in the vale. Unknown fish stay blank. Closing it writes the save.

## Sub-features

- `journal-open` opens the collection from the keyboard once the vale is playing.
- `journal-count` shows landed and seen counts for a fresh origin.
- `journal-close` hides the collection and writes `whisperwood-save-v1`.

## How to get to it (user POV)

- While playing, press `J`.
- Press `J` again, or `Esc`, to close it.
- The on-screen hint reads `J Journal · I Pack`.

## Driving it with the Cursor browser

Preconditions:

- `vale-verify.js doctor` prints `status ok`.
- The play page is past the start screen (see [Enter the vale](./enter-vale.md)). If the snapshot shows `Paused`, choose `Keep fishing` first. That pause is not this feature.
- On a fresh origin the journal has no landed fish.

- **Open.** Press `J`. Run `browser_press_key` with `key` `j`. The visibility JSON has `journal` `open`, `start` `closed`, and `count` `0 / 21 landed · 0 seen`.
- **Proof of the open panel.** Run `browser_snapshot` and `browser_take_screenshot` with `filename` `journal-open.png`. The screenshot shows the Fish Collection panel. Write the snapshot to `open.aria.txt` and the visibility JSON to `open.json`. Copy the image with `vale-verify.js keep journal journal-open.png <screenshot-file>`.
- **Close and confirm the save.** Press `J` again. Run `browser_press_key` with `key` `j`. The visibility JSON has `journal` `closed`. Read `localStorage` key `whisperwood-save-v1` with `browser_cdp` `Runtime.evaluate`, expression `localStorage.getItem('whisperwood-save-v1')`, `returnByValue: true`. Write that string to `save.json`. It parses as JSON, `flags.introComplete` is true, and `journal` has an entry per fish with `landed` 0. `proof.txt` records entry point `J`.

## Gotchas

- Pressing `J` while the start screen is visible starts the vale and does not open the journal.
- Opening the journal packs up a waiting line and fails a live minigame. Prove the journal with the rod packed.
- `Esc` while the journal is open closes it (and writes the save) instead of opening pause.
- The `0 / 12 landed` text in the HTML is replaced when the page boots. The live line uses the fish table length, which is 21. A new fish in `js/config.js` changes the denominator.
- The snapshot lists `Fish Collection` even while the journal is closed. `journal: open` in the visibility JSON, plus the screenshot, is the open proof.
- Closing is what writes the save. An open panel alone is not save proof.
