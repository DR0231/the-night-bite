# Whisperwood Vale — agent notes

## Admin guide stays in sync by reading live tables

Do **not** copy fish lists, prices, wait times, XP, or shop gates into `js/admin-guide.js` as frozen prose.

When you change mechanics:

1. Edit the data object (`FISH`, `BAIT`, `RODS`, `MEALS`, `PERKS`, `SHOP_CATALOG`, `SPOTS`, `FISHING_FEEL`, `WEATHERS`, `NPC_DATA`) or the number on `DESIGN` / `CONFIG` in `js/config.js`.
2. Use those same `DESIGN.*` fields in gameplay code (`skills.js`, `fishing.js`, `survival.js`, `npcs.js`, `quests.js`, …). Do not re-hardcode the number in a second file.
3. Optional extra sentence: set `guide: "..."` on a bait (or `desc` on shop/perk/meal/fish). The F8 **Items** / **Waters** tabs print `desc` automatically.
4. New water or warp: add `SPOTS` + `DESIGN.warps`. New bait: add `BAIT` (and `HOOK_BAIT` if it goes on the hook). The F8 **Cheats** tab rebuilds buttons from those tables on load.

After a Cursor prompt, hard-refresh `play.html` and open F8 → Live check.

Do not add missing `img/*.png` paths. Do not rewrite `sprites.js` player. Vanilla HTML/JS only.
