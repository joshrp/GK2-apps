# Perk settings: build plan for step 4

Brief for step 4 of the perk levels panel: putting it on screen. Agreed with the user on
2026-11-06. Read `CLAUDE.md`, `docs/perk_settings_notes.md` and the ground rules in
`docs/perk_settings_steps_1_2.md` first; they apply here too. The dev server may be started by
the agent (port 5173).

## Goal

The left panel shows every listed perk with an editable level and the recipes it affects, a
Reset button, and the saved-levels warning when there is one. Levels are stored through the
step 3 `perkLevels` store.

**Not in this step:** the "+N more" popover and the footnote (step 5).

## Files

| File                                 | Action                                                  |
| ------------------------------------ | ------------------------------------------------------- |
| `src/lib/styles/tokens.css`          | edit: replace `--color-accent` with three colour tokens |
| `src/lib/perks/levels.ts`            | edit: add `parseLevelInput`                             |
| `src/lib/perks/levels.test.ts`       | edit: tests for `parseLevelInput`                       |
| `src/lib/perks/PerkPanel.svelte`     | new: the panel                                          |
| `src/routes/+page.svelte`            | edit: render `PerkPanel` in the aside                   |

## Colours

`--color-accent` is removed. In its place:

| Token             | Value     | Use                          |
| ----------------- | --------- | ---------------------------- |
| `--color-focus`   | `#32a852` | border of a focused input or button |
| `--color-warning` | `#d9a54a` | the saved-levels warning     |
| `--color-error`   | `#e05252` | an invalid level             |

All text stays white.

## Panel layout, top to bottom

1. The "Perk levels" heading.
2. **Warning**, only when `perkLevels.warnings` is non-empty: one box with the input background
   (`--color-field`), a 1px `--color-warning` border, `--radius` corners, an amber warning icon
   (inline SVG) on the left, the messages in white (one per line), and a × button on the right
   (`aria-label="Dismiss"`) that calls `perkLevels.dismissWarnings()`. `role="status"`.
3. **Rows**, one per perk from `listPerks(gk2Data)` (already sorted by name), each a grid of:
   - name: about 130px, a `<label>` for the input;
   - level: `<input type="number" min="0" step="1">`, about 64px wide, 28px high, input
     background, hairline border, `--radius`, native up/down arrows with a 2px gap before them
     (try `::-webkit-inner-spin-button { margin-left: 2px }`; Chrome may ignore it, which is
     already parked in the notes);
   - Affects: the full list joined with ", ", wrapping onto as many lines as needed.

   Rows are top-aligned (name and Affects line up with the input's text), with a hairline
   divider (`--color-line`) between rows.
4. **Reset** button under the rows, styled like the inputs. Clicking it replaces the button with
   an inline question, "Reset all perk levels to 0?", and Reset and Cancel buttons. Cancel gets
   focus; Esc also cancels; either way focus returns to the Reset button. Not `confirm()`: the
   built-in browser pane blocks it (it returns false at once) and Chrome lets users switch
   dialogs off.

## Level input behaviour

- `parseLevelInput(text)` in `levels.ts`: returns the level for text that is only digits
  (surrounding spaces allowed), else `null`. So `''`, `'-1'`, `'2.5'`, `'1e3'` and `'abc'` are
  `null`; `'0'`, `'7'` and `' 12 '` are numbers.
- On every `input` event: a valid value calls `perkLevels.setLevel` (saved straight away) and
  clears that row's error; an invalid one marks the row invalid and saves nothing.
- An invalid row has `aria-invalid="true"`, a `--color-error` border (this wins over the focus
  colour), and a line under the row, `Enter a whole number, 0 or more.`, linked with
  `aria-describedby`. The line goes as soon as the value is valid.
- Leaving an invalid box keeps what was typed, still marked invalid. Reloading shows the last
  saved level.
- The native arrows fire `input` events, so they save each step.
- Reset also clears every invalid row and shows 0 in every box.

## Wiring

- `PerkPanel` calls `perkLevels.load()` in `onMount`, so the prerendered page never touches
  storage. A brief flash of zeros is accepted (see the notes).
- `+page.svelte` renders `<PerkPanel />` inside the existing `<aside class="panel">`. The panel
  owns its heading and its styles.

## Done when

- [ ] `parseLevelInput` tests pass; `npm run lint`, `npm run check` and `npm test` pass.
- [ ] In the browser at http://localhost:5173:
  - all 19 rows show, sorted by name, with full Affects lists;
  - typing a level saves it, and it survives a reload;
  - the arrows change and save the level;
  - an invalid value shows the red border and message and isn't saved;
  - Reset asks inline first; Cancel (or Esc) changes nothing, Reset sets every perk to 0;
  - a planted bad save shows the amber warning, and × dismisses it;
  - focus shows the green border.
- [ ] No errors or warnings in the console.
- [ ] **Stop. Report to the user** with screenshots and wait for approval before step 5.
