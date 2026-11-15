# Premium UI/UX design specification

## Design thesis
Science fantasy meets credible instrumentation. A clean, tactile **Observatory Lab** with an impressive visual center, readable controls, and deliberate motion. Original look, not a clone of another product. Keep serious physics legible under playful presentation.

## Visual direction
Deep navy `#0B1021`, midnight surface `#141E35`, text `#F6F8FF`, muted slate `#A8B7D4`, aqua `#54E5D3`, electric gold `#FFD36B`, caution coral `#FF746E`; verify text contrast and supply high-contrast alternative. Typography: geometric sans for headlines, humanist UI sans for body; use system fallbacks. Rounded 18–24px cards, subtle glass only where readability survives. Light emission from powered lamps is *data-driven*.

## Layout
Desktop 1440×900: compact top bar (identity, mission, progress, settings), left 260px component library, central flexible 3D stage (~65%), right 320px context panel (mission, live diagnostic, AI mentor), bottom control rail (undo, reset, inspect, schematic toggle). Tablet: collapsible side trays; touch targets >= 44px. Phone: schematic editor and tutoring focus rather than pretending full 3D works well.

## Screens
1. `Launch Portal`: animated planetarium/lab diorama; single `Enter the Lab` CTA, accessible static fallback.
2. `Mission Map`: three chapters with locks, objectives, expected duration, replay.
3. `Workbench`: 3D scene + parts tray + cable ports with snap affordances.
4. `Explain Mode`: side-by-side schematic and plain-language system diagnostics.
5. `Mission Complete`: measured evidence summary, concept learned, next CTA.

## Interaction specs
Hover/pick: glow outline; drag: shadow/ghost placement; connect: port magnet + preview spline; invalid: restrained shake + explanation; simulate: immediate but physically bounded response; hint: layered three levels (nudge → principle → guided move); success: subtle celebratory light beam, not confetti overload.

## Motion & performance
Avoid expensive post-processing on low GPUs. Target 60fps desktop and >=30fps lower-end tablets; adaptive pixel ratio and reduced-motion. Lazy-load 3D scene; use procedural basic meshes, compressed original assets, no giant video hero. No animation should block keyboard focus or clicking.

## Accessibility
Semantic DOM controls outside canvas; keyboard alternative to wire ports; labeled diagnostics and screen-reader announcements when energized state changes. Captions for any audio; focus indicator always visible; no color-only meaning. See `docs/14-ACCESSIBILITY.md`.

## Quality bar
Three coherent environments, not three conflicting art directions. Remove dead buttons. All controls have default, hover, focus, loading, error and disabled states. Capture visual regression screenshots at 1440, 1024, 768 widths.
