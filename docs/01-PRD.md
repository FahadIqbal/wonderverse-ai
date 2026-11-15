# Product Requirements Document

## User journey
Enter as guest → choose Electricity Adventure → tutorial overlay → place battery + bulb → connect terminals → toggle switch → observe bulb responding → request hint if stuck → explain result in teach-back question → mission completion → unlock next mission → recap → replay.

## Functional requirements
| ID | Priority | Requirement | Acceptance signal |
|---|---|---|---|
| FR-01 | P0 | Guest launch without account or payment | Journey begins in <= 2 clicks |
| FR-02 | P0 | 3D component tray and workbench | Add/remove/rotate supported parts |
| FR-03 | P0 | Terminal-to-terminal wiring | Drag from port to port, reject invalid joints |
| FR-04 | P0 | Circuit recomputation on edits | Connected/open/short diagnostic shown accurately |
| FR-05 | P0 | Physics-tied feedback | Bulb only lights for valid safe energized circuit |
| FR-06 | P0 | Three authored missions | Unlock only from documented evidence |
| FR-07 | P0 | Hint and explain interactions | Tutor receives structured solver context |
| FR-08 | P0 | Safe deterministic tutor fallback | Works without cloud model key |
| FR-09 | P0 | Progress persists locally | Refresh restores earned mission results |
| FR-10 | P0 | Reset, undo and help | Undo last meaningful graph edit; reset with confirm |
| FR-11 | P0 | Accessible alternate list/editor | Keyboard-only terminal connectivity possible |
| FR-12 | P1 | Responsive tablet layout | 768px+ workable; phones get simplified mode |
| FR-13 | P1 | Audio narration and muted-by-default SFX | User controls volume and captions |

## Missions
**M1 Complete the Loop:** assemble battery → switch → bulb in a valid series loop; open/close switch to compare outcomes; answer why the bulb changes.
**M2 Fix the Fault:** start with a disconnected wire or open switch; inspect diagnostic and repair; cannot win by button click alone.
**M3 Light the City:** power two bulbs in a parallel branch using the constrained parts tray; discover what happens when one branch is opened; safe limits enforced.

## Experience details
No timed pressure; allow retries and skip narration. Helpful feedback = specific but not solution-spoiling. A `Show me why` view must surface diagnostic truth plus simplified schematic and text equivalent. Provide learner-facing distinction between simplified model and real-world electricity.

## Acceptance
Each FR must have automated verification or a recorded manual test. No `TODO` placeholders in main demo path. Persisted state is versioned and migratable. Error states are actionable. No claims of verified efficacy without evaluation.
