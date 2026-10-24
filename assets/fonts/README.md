# Fonts

All fonts are self-hosted (no third-party font requests; the CSP stays `font-src 'self'`).

| File | Family | Used for | License |
|---|---|---|---|
| `night-bite-pixel-regular.woff2`, `night-bite-pixel-bold.woff2` | Night Bite Pixel | Headings (hero, h1–h3, card titles) and the pool readout numbers | Original work, see below |
| `pixelify-sans-latin*.woff2` | Pixelify Sans | Small UI: nav, wordmark, labels, chips, buttons, footer, readout units | SIL OFL 1.1 (`OFL.txt`) |
| `source-serif-4-*.woff2` | Source Serif 4 | Body text | SIL OFL 1.1 (`OFL.txt`) |

## Night Bite Pixel

Night Bite Pixel is an original pixel typeface drawn for The Night Bite
(nightbiteoh.com). It is not derived from any other font and is not covered by
`OFL.txt`, which applies only to Pixelify Sans and Source Serif 4.

Copyright 2026 The Night Bite. All rights reserved. It may be used on
nightbiteoh.com and in The Night Bite's own projects; ask before reusing it
elsewhere.

Design: 5x7 caps, 5-row x-height, 2-row descenders, 100 font units per pixel on
a 1000-unit (10px) em, 1px tracking, tabular 5px-wide digits, hand-drawn Bold.
Render it only at multiples of 10px (10, 20, 30, 40...) with line-heights in
multiples of 10px so each font pixel lands on whole screen pixels.

## Pixelify Sans edits

`pixelify-sans-latin.woff2` is Pixelify Sans with a few glyphs redrawn on its own square
pixel grid so they stay readable at the 12px UI size: B and 5 (October 22), and E, S, 2
and 3 (October 24; the stock E read as a backwards 3 on phones). The weight axis deltas for
the redrawn glyphs follow the font's own per-coordinate pattern, so bolder weights still
match. The edits stay under the SIL OFL 1.1.
