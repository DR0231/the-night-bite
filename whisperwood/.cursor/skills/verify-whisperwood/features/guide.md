# Guide

The guide is the how-to-play page. It links back into the vale and does not change the save.

## Sub-features

- `guide-direct` opens the page from its own URL.
- `guide-nav` opens it from the play page navigation.
- `guide-home` opens it from the home page.
- `guide-play` returns from the guide to the play page.

## How to get to it (user POV)

- Choose `Guide` in the site navigation on Home or Play.
- Open `guide.html`.
- On the guide, choose `Play now` or `Play`.

## Driving it with the Cursor browser

Preconditions:

- `vale-verify.js doctor` prints `status ok`.
- Use the printed `guide` and `home` URLs, which share the verification port. Do not use a different host or port.

- **Direct URL.** Open the doctor `guide` URL. Run `browser_navigate` to that URL. The snapshot shows heading `A quiet walk, then a cast` and a link named `Play now`.
- **Proof.** Run `browser_snapshot` and `browser_take_screenshot` with `filename` `guide.png`. Write the snapshot to `open.aria.txt`. Copy the image with `vale-verify.js keep guide guide.png <screenshot-file>`. `proof.txt` records entry point `guide-direct`.
- **From play.** Open the doctor play `url`. Run `browser_click` on the link named `Guide`. The same heading is shown, and the address stays on this run's port.
- **From home.** Open the doctor `home` URL. The snapshot shows heading `Whisperwood Vale` and a link named `How to play`. Activate `How to play`. The guide heading is shown.
- **Back to play.** On the guide, activate `Play now`. The visibility JSON on `play.html` has `start` `open`, and `startBtn` is `Enter the Vale` or `Return to the Vale`. Read `whisperwood-save-v1`. Visiting the guide does not by itself create that key when the origin had none.

## Gotchas

- Home and the guide are static pages. They do not boot the canvas. `Boot failed` cannot appear there, and `J` does not open the journal.
- `Play now` on the guide loads `play.html` on the same origin, so it sees whatever save that port already has.
- The play nav `Guide` link is present on the start screen and while playing. Either moment is a valid `guide-nav` entry. Record which one you used.
