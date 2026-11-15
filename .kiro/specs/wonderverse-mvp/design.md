# Design spec

Pure `CircuitGraph` reducer → `solveCircuit(graph)` → immutable `SimulationReport` → `MissionEvaluator(report, eventLog)` → `LabScene` and `SchematicEditor`. `TutorAdapter` reads report + mission only; no write access. `SessionStore` persists versioned graph, mission progress, settings. A lightweight React router controls portal, mission map, lab, recap. Shared design tokens as CSS custom props; WebGL fallback is feature-detected. Backend optional; expose one bounded hint endpoint without secrets in browser.

Component plan: AppShell, MissionMap, LabLayout, ComponentTray, SceneCanvas, CableConnectController, SchematicEditor, CircuitDiagnostic, TutorPanel, MissionHUD, CompletionDialog, SettingsDrawer. Define semantic events and test with fixed fixtures. Avoid any direct engine calculations in UI effects.
