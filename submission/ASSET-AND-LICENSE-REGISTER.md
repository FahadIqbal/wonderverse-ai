# Assets, sources & licensing register

Checked from repo contents and `node_modules/*/package.json` on 2026-11-15 (run on the author's machine). "Verified" means I read the evidence named in the row. It does not mean legal review.

## Shipped assets
| Asset | Origin | License / permission | Used where | Verified? |
|---|---|---|---|---|
| 3D components (battery, switch, lamp, resistor, wires, grid) | Built in code from three.js primitives in `src/features/lab/scene/`. No `.glb`, `.gltf` or texture files exist in the repo, and `useGLTF`/`useTexture` are not used (grep of `src/` and `public/`). | Original code, MIT (repo `LICENSE`) | 3D workbench | Yes (repo search) |
| Schematic symbols | Inline SVG drawn in `src/features/lab/SchematicCanvas.tsx`. No icon library in `package.json`. | Original code, MIT | Schematic view | Yes (package.json, source) |
| Icons | None. UI uses text labels and a few Unicode characters (check marks, circles). | n/a | UI | Yes (no icon dependency or image files) |
| Favicon `public/favicon.svg` | Original: a circle and "WV" text, authored for this project. It was first committed as `public/vite.svg` (the filename only; the content is not the Vite logo). | Original, MIT | Browser tab | Yes (file read) |
| Typography | **No font files are shipped.** CSS names `Inter` and `JetBrains Mono` (`tailwind.config.js`, `src/index.css`) but there is no `@font-face`, no font package and no web-font request. Visitors see those fonts only if installed on their device; otherwise the system fallback. | n/a (nothing distributed). If you later self-host Inter or JetBrains Mono, both are SIL OFL 1.1; record it here. | Site | Yes for "nothing shipped"; font licenses not checked |
| Audio | None. No audio files or audio code. | n/a | n/a | Yes (no audio files in repo) |
| Images / video in the app | None. Screenshots in `submission/screenshots/` are captures of this app. | Original | Devpost | Yes |
| Scientific references | None cited in the app. The simplified DC model (Ohm's law, series and parallel resistance, ideal battery) is textbook physics; no copied text or figures. Mission wording is original (`docs/13`). | n/a | Curriculum | Partly: I did not search for copied text outside this repo |

## Runtime dependencies (`package.json` `dependencies`, license read from `node_modules/<pkg>/package.json`)
| Package | Installed | License |
|---|---|---|
| react, react-dom | 18.3.1 | MIT |
| three | 0.187.0 | MIT |
| @react-three/fiber | 8.18.0 | MIT |
| @react-three/drei | 9.122.0 | MIT |
| zod | 3.25.76 | MIT |
| zustand | 5.1.0 | MIT |
Transitive packages of drei present in `node_modules`: three-stdlib 2.36.1 (MIT), meshline 3.3.1 (MIT), troika-three-text 0.52.5 (MIT), draco3d 1.5.9 (Apache-2.0). Which of these end up in the production bundle was not inspected, and the full transitive tree was not audited.

## Build and test tooling (`devDependencies`, not shipped to users)
vite 6.4.6, vitest 2.1.9, eslint 9.39.5, tailwindcss 3.4.19, autoprefixer 10.6.2, jsdom 26.1.0, fast-check 4.10.2 are MIT. typescript 5.6.3 and @playwright/test 1.65.1 are Apache-2.0. axe-core 4.14.0 is **MPL-2.0** (test-only, not bundled). Other dev packages were not individually checked.

## Optional tutor gateway (`services/tutor`)
`requirements.txt` lists fastapi, uvicorn and pydantic. Their licenses were **not verified** here (no installed copy was read in this pass).

## Code originality
`AGENTS.md` requires a fresh implementation inside the event window. The git history has five commits, all dated 2026-11-15 (`git log --date=iso`). Whether the author reused any earlier WonderVerse code is something only the author can confirm; nothing in the repo shows it, and nothing in the repo proves the negative.

## Rules
Do not add assets without recording rights. Use recognizable brand assets or copyrighted music only with express permission. Include third-party notices if licenses require it.
