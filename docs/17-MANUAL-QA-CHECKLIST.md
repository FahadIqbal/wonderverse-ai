# Manual QA checklist (real devices and assistive tech)
Status key: **NOT DONE** means nobody has performed it. Playwright device emulation (docs/18) is not a substitute for any item here. Change a status only after you actually ran the check, and add the date, device and tester.

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
| 12 | Safari and Firefox desktop smoke test | Playwright projects only use Chromium (Chrome or bundled). | NOT DONE |
| 13 | 200% and 400% browser zoom | Check no content is lost or overlapped, and the schematic scrolls. | NOT DONE |
| 14 | Windows High Contrast / forced colors visual review | Check focus rings, disabled buttons and the schematic. | NOT DONE |
| 15 | System reduced-motion setting on a real OS | Emulated `prefers-reduced-motion` is covered in jsdom and Chrome (T11). | NOT DONE |
| 16 | Network throttling (Slow 3G) cold load | Check the lazy 3D chunk shows the loading message and then the scene. | NOT DONE |
| 17 | Tutor model outage with a real gateway | Needs a deployed gateway and a real provider (none is implemented). | NOT DONE |
| 18 | Deployed URL smoke test in a clean profile | Part of T13. | NOT DONE |
| 19 | External keyboard on tablet (Tab, Enter, Esc, Ctrl+Z) | Check shortcuts and focus order. | NOT DONE |
| 20 | Landscape phone layout (844x390) | Playwright covers portrait phone only. | NOT DONE |
