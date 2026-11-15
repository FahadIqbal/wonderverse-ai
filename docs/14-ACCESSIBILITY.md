# Accessibility & inclusive experience

## Core requirement
Canvas-only interactions exclude learners. Build an accessible DOM schematic editor parallel to 3D; both use the same circuit state/store and solver. A learner must complete the core mission using keyboard + screen reader.

## Specific design patterns
- A circuit part is a focusable item with label `Battery, 3 volts, 2 terminals`.
- Select component via keyboard, choose `Connect from` terminal and `Connect to` terminal via native form controls; do not require drag-and-drop.
- State changes produce throttled `aria-live=polite` announcements (e.g. "Circuit open; bulb off").
- Buttons use native semantics; modal traps focus; escape closes; focus returns to origin.
- Provide text labels for connection reason codes; avoid information only communicated through glow/color/sound.
- Support zoom to 200%, reduced-motion, high-contrast, captions for narrated content.
- Evaluate both visual and nonvisual paths with manual QA; automated audit alone is insufficient.

## Localized language roadmap
Plain English first. Structure strings for i18n from day one, but do not claim multilingual support without shipping translated content and language testing.
