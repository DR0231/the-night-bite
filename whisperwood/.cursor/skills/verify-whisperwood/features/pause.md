# Pause

Pause stops the vale behind a menu. Keep fishing closes the menu and returns to the HUD.

## Sub-features

- `pause-open` opens the menu from Esc while nothing else is open.
- `pause-resume` closes it with Keep fishing.
- `pause-blur` can open the same menu when the window blurs. That path is not the Esc proof.

## How to get to it (user POV)

- While playing, with no other panel open, press `Esc`.
- Choose `Keep fishing`.
- Leaving the window or hiding the tab opens the same menu when no panel is already up.

## Driving it with the Cursor browser

Preconditions:

- `vale-verify.js doctor` prints `status ok`.
- The play page is past the start screen.
- The snapshot does not show `Fish Collection`, `Pack`, or `Paused`. If it shows `Paused` already, choose `Keep fishing` and snapshot again before pressing `Esc`.

- **Open from Esc.** Press `Esc`. Run `browser_press_key` with `key` `Escape`. The visibility JSON has `pause` `open`. The snapshot's interactive button `Keep fishing` (`#pause-resume`) is present, and `Reset the whole vale?` is not an interactive control.
- **Proof of the menu.** Run `browser_snapshot` and `browser_take_screenshot` with `filename` `pause-open.png`. The screenshot shows the Paused menu. Write the snapshot to `open.aria.txt` and the visibility JSON to `open.json`. Copy the image with `vale-verify.js keep pause pause-open.png <screenshot-file>`.
- **Resume.** Choose `Keep fishing` (`#pause-resume`). Run `browser_click` on that ref. The visibility JSON has `pause` `closed` and `start` `closed`. `proof.txt` records entry point `Escape`.

## Gotchas

- `Esc` while the journal, pack, or another panel is open closes that panel. It does not open pause.
- `Esc` during a cast reels the line in instead of pausing. Prove pause with the rod packed.
- `Esc` on the start screen starts the vale and does not open pause.
- A blur-opened menu matches the same heading. Count it as `pause-open` only when the key press was `Escape` and the visibility JSON had `pause` `closed` beforehand.
- The snapshot lists heading `Paused` while the menu is closed. `pause: open` is the open proof.
- `Full reset` and `Reset the vale` wipe this origin's save and reload. Do not click them as part of this proof.
