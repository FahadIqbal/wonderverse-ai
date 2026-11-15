# Assets, sources & licensing register

Checked from repo contents and `node_modules/*/package.json` on 2026-11-15 (run on the author's machine; the licence audit below was repeated later the same day). "Verified" means I read the evidence named in the row. It does not mean legal review.

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
### Full npm licence audit (2026-11-15, `package-lock.json` as installed)
Method: `npm ls --all --parseable` (with and without `--omit=dev`), then the `license` field of each installed `package.json`; a script, not a legal review. Output of the script, by licence expression:
| Set | Packages | MIT | Apache-2.0 | ISC | BSD-3-Clause | other |
|---|---|---|---|---|---|---|
| Production tree (`--omit=dev`) | 84 | 74 | 5 | 3 | 1 | 1 with no `license` field |
| Whole tree incl. dev tooling | 399 | 335 | 28 | 18 | 4 (plus 8 BSD-2-Clause) | MPL-2.0 x1, CC-BY-4.0 x1, BlueOak-1.0.0 x1, Python-2.0 x1, MIT-0 x1, no field x1 |
- **GPL, AGPL, LGPL, SSPL or commercial licences: none found** in either set.
- **No `license` field:** `webgl-constants@1.1.1`, a production transitive dependency (react-three/drei, via detect-gpu). Its `LICENSE` file in `node_modules` is the MIT licence (copyright 2019 Tim van Scherpenzeel). Treated as MIT from that file.
- **MPL-2.0:** `axe-core` 4.14.0, dev and test only, not in the bundle. **CC-BY-4.0:** `caniuse-lite`, browser-support data used by build tooling, not shipped. **MIT-0:** `@csstools/color-helpers` (build tooling). Python-2.0 (`argparse` 2.0.1) and BlueOak-1.0.0 (`minimatch` 10.2.6) are tooling.
- Production Apache-2.0 packages: @mediapipe/tasks-vision, hls.js, promise-worker-transferable, draco3d, @dimforge/rapier3d-compat (all drei dependencies; whether the bundle includes them was not inspected). Production ISC: potpack, which, isexe; BSD-3-Clause: ieee754.
- Drei transitive packages seen earlier: three-stdlib 2.36.1, meshline 3.3.1, troika-three-text 0.52.5 (MIT) and draco3d 1.5.9 (Apache-2.0). Which packages end up in the production bundle was still not inspected; the audit covers everything installable.
- Attribution: MIT, ISC, BSD and Apache-2.0 require the licence text and notices to travel with copies of the code. The deployed site does not show a third-party notices page. If you want strict compliance, add one; this was not done.

## Build and test tooling (`devDependencies`, not shipped to users)
vite 6.4.6, vitest 2.1.9, eslint 9.39.5, tailwindcss 3.4.19, autoprefixer 10.6.2, jsdom 26.1.0, fast-check 4.10.2 are MIT. typescript 5.6.3 and @playwright/test 1.65.1 are Apache-2.0. axe-core 4.14.0 is **MPL-2.0** (test-only, not bundled). Other dev packages were not individually checked.

## Optional tutor gateway (`services/tutor`)
`requirements.txt` lists fastapi, uvicorn and pydantic; `requirements-dev.txt` adds pytest and httpx. Checked on 2026-11-15 by installing `requirements-dev.txt` into a throwaway venv under /tmp (Python 3.15) and reading each installed package's metadata (`importlib.metadata`: `License-Expression`, `License`, classifiers). pytest then ran: 19 passed.
| Package (resolved version) | Licence | Role |
|---|---|---|
| fastapi 0.163.0 | MIT | runtime |
| starlette 1.10.0 | BSD-3-Clause | runtime (fastapi) |
| uvicorn 0.54.0 | BSD-3-Clause | runtime |
| click 8.5.1, h11 0.16.0 | BSD-3-Clause, MIT | runtime (uvicorn) |
| pydantic 2.14.3, pydantic_core 2.50.4, annotated-types 0.8.0, typing-inspection 0.4.5, annotated-doc 0.0.6 | MIT | runtime |
| anyio 4.16.0, idna 3.20 | MIT, BSD-3-Clause | runtime |
| typing_extensions 4.16.0 | PSF-2.0 | runtime |
| opentelemetry-api 1.45.2 | Apache-2.0 | pulled in by this resolve (not named in requirements) |
| pytest 8.4.2, pluggy 1.7.0, iniconfig 2.3.1, Pygments 2.21.0, packaging 26.3 | MIT, MIT, MIT, BSD-2-Clause, Apache-2.0 OR BSD-2-Clause | dev only |
| httpx 0.28.1, httpcore 1.0.9, certifi 2026.10.23 | BSD-3-Clause, BSD-3-Clause, **MPL-2.0** | dev only (test client) |
No GPL, AGPL or LGPL package. The requirements use open version ranges, so a later install can resolve different versions; re-run the check if the gateway is deployed. The gateway is not deployed.

## Code originality — USER TO CONFIRM
`AGENTS.md` requires a fresh implementation inside the event window. The git history has seven commits (at the time of this check, before the closing-pass commit), all dated 2026-11-15 (`git log --date=iso`). Whether the author reused any earlier WonderVerse code is something only the author can confirm; nothing in the repo shows it, and nothing in the repo proves the negative.

## Rules
Do not add assets without recording rights. Use recognizable brand assets or copyrighted music only with express permission. Include third-party notices if licenses require it.
