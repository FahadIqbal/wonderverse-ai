# Manual QA checklist (real devices and assistive tech)
Status key: **NOT DONE** means nobody has performed it. **DONE-EMULATED** means an automated Playwright run (docs/18, 2026-11-15) exercised an emulation or engine-level stand-in; it is not the real-device or real-assistive-tech check and the item's real-world part is still open. Playwright device emulation (docs/18) is not a substitute for any item here. Change a status only after you actually ran the check, and add the date, device and tester.

> Layout note (final pass): the mission page now puts the lab first and the objectives beside it (desktop) or below it (tablet, phone). Items 1 to 5, 13 and 20 should be run against this layout. Nothing in this file was performed in that pass.

> Emulation pass (2026-11-15, after the layout pass): items 12 to 15 now carry DONE-EMULATED where `e2e/emulation.spec.ts` or the opt-in Firefox/WebKit projects (`E2E_CROSS=1`) ran. Items needing a real device, real OS setting, real GPU or screen reader are unchanged (NOT DONE).

| # | Check | How | Status |
|---|---|---|---|
| 1 | Real phone (iOS Safari, current): portal to mission 1 complete by touch | Open the deployed URL in a private tab. Wire the loop in the schematic, toggle the switch, answer the quiz, finish. | NOT DONE |
| 2 | Real phone (Android Chrome): same flow | As above. | NOT DONE |
| 3 | Real tablet (iPad Safari, portrait and landscape): 3D view, tap two ports, tap the switch | Tap glowing ports in the canvas, not the list. Check orbit by drag does not scroll the page. Pinch zoom works. | NOT DONE |
| 4 | Pinch zoom and orbit fight with page scroll on a touch device | Scroll the page with a finger that starts on the canvas. | NOT DONE |
| 5 | 3D bench fully visible on phone, portrait and landscape | Check battery, switch and lamp are all in frame. Emulation only: the camera fit was verified in Chrome device emulation, not on a device. | NOT DONE |
| 6 | VoiceOver (macOS Safari) walkthrough of the schematic and the port list | Complete mission 1 with the screen reader. Check lamp status announcements, dialog focus and the live regions. | NOT DONE |
| 7 | VoiceOver on iOS | Same, using swipe navigation. | NOT DONE |
| 8 | TalkBack on Android | Same. | NOT DONE |
| 9 | NVDA or JAWS on Windows (Firefox or Chrome) | Same. | NOT DONE |
| 10 | Real GPU rendering (integrated and discrete) | Check glow, wire flow dots and frame rate in the 3D view. All automated runs used SwiftShader software GL. | NOT DONE |
| 11 | Low-end device or 4x CPU throttle plus Low-power mode | Check the 3D view stays usable and Low-power drops animation. | NOT DONE |
| 12 | Safari and Firefox desktop smoke test | Ran Playwright's Firefox 159.0 and WebKit 27.2 builds on macOS (not Firefox or Safari releases): 156 passed, 24 skipped, 0 failed over 3 repeats (docs/18). Not done: real Safari, real Firefox, any iOS/Android browser. | **DONE-EMULATED** (engine-level) |
| 13 | 200% and 400% browser zoom | Check no content is lost or overlapped, and the schematic scrolls. | **DONE-EMULATED** (viewport only) |
| 14 | Windows High Contrast / forced colors visual review | Check focus rings, disabled buttons and the schematic. | **DONE-EMULATED** (Chromium media emulation) |
| 15 | System reduced-motion setting on a real OS | Emulated `prefers-reduced-motion` is covered in jsdom and Chrome (T11). | **DONE-EMULATED** (media emulation) |
| 16 | Network throttling (Slow 3G) cold load | Check the lazy 3D chunk shows the loading message and then the scene. | NOT DONE |
| 17 | Tutor model outage with a real gateway | Needs a deployed gateway and a real provider (none is implemented). | NOT DONE |
| 18 | Deployed URL smoke test in a clean profile | Part of T13. Automated clean-context Playwright run against the live URL passed (docs/18); a human check in a real private window is still open. | PARTIAL |
| 19 | External keyboard on tablet (Tab, Enter, Esc, Ctrl+Z) | Check shortcuts and focus order. | NOT DONE |
| 20 | Landscape phone layout (844x390) | Playwright (`e2e/mobile-layout.spec.ts`, 844x390) and the Android emulator (portrait and landscape, Chrome 145; docs/18, 2026-11-18) show the stage on the first screen with 44 px targets. Not done on a real phone. | **DONE-EMULATOR** (emulator and Playwright only; real device NOT DONE) |
| 21 | Android emulator, Chrome 145: portal to recap, reload, erase | Pixel_10_Pro AVD, Android 17 (API 37), `-gpu swiftshader_indirect`, driven over CDP with real touch events. 19 of 20 steps passed on the final build; the one miss was the script tapping a node that had just re-rendered (the app had moved on). Under `-gpu host` the 3D canvas is never shown (emulator compositing); the new fallback button covers it. Not a real phone. | **DONE-EMULATOR** |
| 22 | Android WebView 145 (test shell, not shipped): the same walk | A 5 KB shell APK built outside the repo. 20 of 20 steps passed. DOM storage off: app runs, storage notice shown. System font scale 1.3 applied inside the WebView. | **DONE-EMULATOR** |
| 23 | Android hardware Back key | `adb shell input keyevent BACK`: closes the tour, closes the recap dialog, goes map to start. Real device Back gesture NOT DONE. | **DONE-EMULATOR** |
| 24 | Real Android phone, 3D view on a real GPU | The emulator's host GPU does not show WebGL canvases at all, so the 3D view on Android has only been seen under software GL. | NOT DONE |
