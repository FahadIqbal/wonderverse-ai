# Accessibility and feedback audit (T11)

Scope: every interactive control in `src/`. "Status" is the state after T11. Checks are jsdom tests (Vitest, Testing Library, axe-core) plus one run in real Chrome; no screen reader was used.

| Control | Disabled state (and why it is shown) | Loading / error feedback | Keyboard path | Status |
|---|---|---|---|---|
| Enter the Lab | never disabled | none needed (sync) | Tab, Enter; focus lands on next `h1` | OK |
| Skip link | n/a | n/a | first Tab stop; target `main` is focusable | Fixed: `main` now `tabIndex=-1` |
| Back to missions / Back to start | never disabled | none | Tab, Enter | OK |
| Mission map: Start/Continue/Review | disabled when locked; `aria-describedby` points at the status text ("Locked. Finish Mission N first.") | status text is not colour-only | Tab, Enter | OK |
| Erase my progress + confirm dialog | confirm needed | polite status for done and failed; storage-off notice | dialog traps focus, Esc cancels | OK, dialog fixed (inert background) |
| Start mission | never disabled | none | `autoFocus` | OK |
| Component tray: Add X | Add Battery disabled once one exists, with a visible hint linked by `aria-describedby` | feedback line (`role=status`) says what was added | Tab, Enter | OK, touch target fixed (44px) |
| Clear circuit | disabled when empty (obvious from the empty list) | feedback line; undoable | Tab, Enter | OK |
| Undo / Redo / Reset circuit | disabled when nothing to undo/redo/reset; help text explains reset state | feedback line; reset needs confirm | Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z, Tab | OK |
| Reset confirm dialog | Cancel is the first focus | n/a | Tab wraps, Esc closes, focus returns to opener (or the page heading if the opener is disabled) | Fixed |
| View toggle (3D / Schematic) | 3D disabled without WebGL, after a crash, or after context loss | note explains why (`aria-describedby` added); `role=alert` after a crash or context loss | Tab, Enter; `aria-pressed` | Fixed (describedby, focus handling) |
| Try 3D again | shown only after a failure | focus moves to it when the 3D view disappears; back to the toggle after retry | Tab, Enter | New |
| Low-power checkbox | never disabled | toggles `data-motion` on `<html>` immediately; saved with the session | Tab, Space | OK, 44px target |
| 3D canvas ports / switch | pointer only | caption says so; hover/selected highlight | use "Components and ports" list | OK (list is the keyboard path) |
| Port list buttons | none | selection and rejection go to the live feedback line | Tab, Enter; `aria-pressed` | Fixed: switch button's visible text now matches its accessible name (axe `label-content-name-mismatch` in Chrome) |
| Schematic terminals | none | pending source announced in the live region | focusable, Enter/Space; hit area now 44 units; svg is at least 680px wide and scrolls | Fixed |
| Schematic parts and wires | none | feedback line | Delete removes; Enter toggles a switch | OK |
| Schematic Toggle/Remove buttons | none | feedback line | Tab, Enter | OK, 44px |
| Lamp lit / dark | n/a | new throttled polite announcement ("Circuit complete: Lamp 1 is lit.") from the report only | n/a | New (docs/14) |
| Hint button (HUD) | disabled out of progress or at the cap; hint count text linked | hint list appears | Tab, Enter | OK |
| Concept check (radios, Check answer) | Check answer disabled until a choice is made, then after a correct answer; status text explains | result text starts with "Correct." or "Not quite." (not colour only) | arrows, Tab, Enter | OK, 44px rows |
| Finish mission | disabled until objectives are met; `finish-reason` lists what is left | n/a | Tab, Enter | OK |
| Completion dialog (Next / Back / Close / Replay) | n/a | n/a | focus on heading, Tab wraps, Esc closes, background inert, focus restored | Fixed (shared `ModalShell`) |
| View recap | shown when complete | n/a | Tab, Enter | OK |
| Tutor input and Ask | disabled while loading, after completion, at the hint cap; reason text now also covers "not started" and "complete" | `aria-busy`, "Nova is looking...", error text, "offline hint" label | Tab, Enter | Fixed (reason text, 44px) |
| Lab feedback line (`FeedbackBar`) | n/a | one `role=status` line in both views; errors add an alert icon, a coral border and the words "Connection rejected" (not colour only); shake only when motion is allowed | n/a | Restyled (visual polish pass) |
| Mission map progress bar | n/a | `role=progressbar` with value text "N of 3 missions complete", same text shown above it | n/a | New |
| Whole app crash | n/a | `AppErrorBoundary`: "Something went wrong", Try again, Reload | focus moves to the message | New |

## Checks and what they cover
- axe-core 4 (WCAG 2.0/2.1 A and AA plus best-practice) on portal, map, mission briefing, schematic workbench, 3D workbench DOM (canvas stubbed), the reset and erase dialogs and the recap dialog: no violations (`src/app/a11y.test.tsx`).
- The same axe rules with colour contrast on in real Chrome on portal, map, the 3D mission view and the reset dialog: no violations after the fix above.
- Contrast ratios are computed from the palette in `src/ui/palette.test.ts` (text on navy, surface, raised and error backgrounds all at least 4.5:1; focus ring and field border at least 3:1).
- Dialog focus, inertness and focus restore: `src/ui/ModalShell.test.tsx` and the existing mission-flow tests.

## Not covered
No screen reader (VoiceOver, NVDA) pass, no 200% zoom or real touch-device pass, no high-contrast or forced-colors visual review beyond a computed outline check, and the 3D canvas itself has no accessible alternative other than the port list and schematic. These stay on the manual QA list (T12).
