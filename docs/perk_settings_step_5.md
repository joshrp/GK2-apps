# Perk settings: build plan for step 5

Brief for step 5, the last step of the perk levels panel: the Affects "+N more" popover and the
footnote. Agreed with the user on 2026-11-06. Read `CLAUDE.md`, `docs/perk_settings_notes.md`
and the ground rules in `docs/perk_settings_steps_1_2.md` first; they apply here too. The dev
server may be started by the agent (port 5173).

## Files

| File                             | Action                                    |
| -------------------------------- | ----------------------------------------- |
| `src/lib/perks/perks.ts`         | edit: add `previewAffects`                |
| `src/lib/perks/perks.test.ts`    | edit: tests for `previewAffects`          |
| `src/lib/perks/PerkPanel.svelte` | edit: preview, popover and footnote       |

## Which rows get a button

```ts
/** Names shown before the "+N more" button, and how many it hides. Up to 4 show in full. */
export function previewAffects(affects: string[]): { shown: string[]; hidden: number };
```

- Up to 4 names: all shown, `hidden: 0`, no button. So there is never a "+1 more".
- 5 or more: the first 3 shown, the rest hidden.
- In today's data: Compost Chemist +4, Cook +9, Cook II +19, Heat Saver +24, Paper maker +3. The
  other 14 perks show their full list.

Tests: `[]`, 1, 4 (all shown) and 5 (3 shown, 2 hidden) names, and order kept.

## Preview

The shown names joined with ", ", then a small "+N more" button (input background, hairline
border, `--radius`, `--font-size-sm`). Names and button wrap like the rest of the column.

## Popover

- Opens directly under its row, as wide as the row (the panel's content width), floating over
  the rows below (`position: absolute` in the row). The page doesn't move.
- Input background, hairline border, `--radius`, padding. A header line,
  "<Perk> affects N recipes", with a × button (`aria-label="Close"`) on the right, then every
  name in two columns.
- One popover at a time; opening another closes the first.
- Closes with: its ×, Esc, a click anywhere outside the popover and its button, or its button
  again. Esc and × return focus to the "+N more" button.
- The button has `aria-expanded` and `aria-controls`. Focus stays on the button when it opens;
  Tab moves into the popover, which comes next in the page order. The popover is
  `role="dialog"` (non-modal) with an `aria-label`.

## Footnote

Under the Reset button (or the inline Reset question), at the bottom of the panel, in
`--font-size-sm` white text:

> Only your character's perk levels are used. Update the app when zombie or worker levels need
> to be included.

## Done when

- [ ] `previewAffects` tests pass; `npm run lint`, `npm run check` and `npm test` pass.
- [ ] In the browser at http://localhost:5173:
  - exactly the 5 perks above have a button, with those counts; Carpenter, Engineer and
    Glassworker show their 4 names in full;
  - the popover opens under its row over the rows below, with the header and two columns;
  - ×, Esc, a click outside and the button again each close it; Esc and × return focus;
  - opening a second popover closes the first;
  - Paper maker's popover, near the bottom, is fully visible (scrolling if needed);
  - the footnote shows under Reset.
- [ ] No errors or warnings in the console.
- [ ] **Stop. Report to the user** with screenshots.
