# Local notes (Water page, #notes)

The Local notes section on water.html holds the owner's own first hand notes, one folded card per lake.

**It stays hidden until there is at least one real note.** The section ships with the `hidden` attribute, and
js/local-notes.js only unhides it when it finds a `<li class="note-slot note-real">`. Right now every slot is a
dashed "Sample note, replace with your own" template, so visitors see nothing and the Water scroll column skips it.

When it does show:
- only lakes with a real note get a card (a Hoover note does not reveal empty Alum Creek or Buckeye Lake cards);
- leftover sample slots are hidden, so you can keep them in the file as templates.

To add a real note, edit water.html between `<!-- local-notes -->` and the end of the `#notes` section:

1. Find the lake's block (`data-for="hoover"`, `"alum"` or `"buckeye"`, class `notes-lake`).
2. Add (or turn a sample into) a slot with the `note-real` class:

   ```html
   <li class="note-slot note-real">
     <p class="note-slot-label">Oct. 2026</p>
     <p class="note-slot-body">Spot, when, what you saw.</p>
   </li>
   ```

3. Update the count in that lake's summary (`2 sample slots` becomes `1 note`, for example).
4. Run tools/stamp-version.py, bump VERSION in sw.js, commit.

To hide the section again, remove `note-real` from every slot (or delete the real slots).

Rules: date every note, keep it to what you saw yourself, and never add stocking numbers, depths or regulations here.
Those belong in the sourced sections above it.
