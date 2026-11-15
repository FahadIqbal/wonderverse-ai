# Final demo script (target 2:45, hard limit under 3:00)

App: https://wonderverse-ai.vercel.app (the deployed site, not localhost). Every on-screen label below was taken from the shipped UI or from the E2E specs in `e2e/` that run against it. Screen layout facts come from the screenshots in `submission/screenshots/` (captured from the live site).

**Status: NOT RECORDED.** This is a script. Nobody has rehearsed it on camera. Rehearse once and fix any line that no longer matches what the app does.

## Facts to keep in mind while recording

- The lab (3D bench or schematic) is at the top left of the mission page, with objectives, concept check, finish button and tutor in a panel on the right. On a 1280x800 window the whole 3D stage is on screen with no scrolling and no browser zoom (checked by an E2E assertion and a screenshot). The component list and the Circuit diagnostic table are further down the page; scroll once to show the diagnostic table next to a lit lamp.
- Mission 1 starts with the battery, switch and lamp placed and **no wires**. The switch starts open.
- Missions unlock in order. Mission 3 stays locked until mission 2 is done, so this script shows mission 3 only as a map card. Do not imply it was played in the video.
- The tutor is the **Local guide** (offline, rule-based, reads the solver report). No AI model is connected. Say so. The UI labels the answer "Local guide".
- Do not say "real physics". Say "simplified DC model: ideal battery, fixed-resistance lamps".

## Pre-recording checklist

- [ ] New browser profile (or Chrome Guest window). No extensions, no bookmarks bar, no other tabs, no saved logins visible.
- [ ] Open the live URL in a **private/guest window** and confirm it loads without any login or Vercel SSO redirect. Use the production URL, not the `-git-main-...vercel.app` alias (the alias redirects anonymous visitors to Vercel login per docs/18).
- [ ] Display 1920x1080, recording at 1080p, 30 fps. Close notifications (Do Not Disturb on).
- [ ] No terminal, `.env`, API key, or token on screen. No personal name, email or home path visible (hide the macOS menu bar clock/account if needed; crop or use window capture).
- [ ] Progress is clean: Start from "0 of 3 missions complete". If not, use "Erase my progress" first, then reload.
- [ ] Window at 1280x800 or larger at 100% zoom. The 3D stage should be fully visible on opening a mission; if it is not, the layout regressed.
- [ ] Captions: write them as an `.srt` file from the narration column below and upload it to YouTube, or burn them in. Check they match what is said.
- [ ] Microphone test. Quiet room. Narrate at a steady pace (the lines below are about 330 words, about 2:20 at normal speed; re-time on a real take).
- [ ] No copyrighted music. Use none, or an original/CC0 track recorded in `submission/ASSET-AND-LICENSE-REGISTER.md`.
- [ ] Do not edit out a failure to hide it. Cuts for length are fine if the on-screen result stays true.
- [ ] After upload: set visibility to **Public**, watch the full video once with sound, confirm length is under 3:00, and paste the URL into the Devpost form.

## Shot list

| Time | On-screen action (exact) | Narration | Proves |
|---|---|---|---|
| 0:00-0:10 | Portal page (observatory starfield, battery-switch-lamp icon row): heading "Welcome to the Electricity Lab", text "No account or sign-in needed" visible. Click **Enter the Lab**. | "WonderVerse AI is an electricity lab for kids aged 10 to 14. It runs in the browser with no sign-in. This is the live deployed site." | Guest access (R1), real deployed app |
| 0:10-0:20 | Mission map: heading "Electricity Lab missions", "0 of 3 missions complete" and a progress bar. Three mission cards with artwork; Mission 1 shows "Status: Unlocked", 2 and 3 show "Status: Locked. Finish Mission N first." Click **Start Mission 1**, then **Start mission** on the briefing. | "Three missions, unlocked in order. A mission state machine tracks progress." | Missions |
| 0:20-0:30 | Lab opens. 3D view selected, bench on screen. Lamp is dark. Scroll once to the diagnostic table: lamp row "Idle". | "A battery, a switch and a lamp, not yet wired. The lamp is dark because the solver says there is no path." | 3D bench + solver report drive the lamp |
| 0:30-0:55 | In the 3D view click port pairs: Battery 1 positive to Switch 1 left; Switch 1 right to Lamp 1 left; Lamp 1 right to Battery 1 negative. (The "Components and ports" list does the same with buttons.) | "I connect the loop by clicking ports in 3D. Each wire updates one circuit graph." | 3D manipulation writes the canonical graph |
| 0:55-1:10 | Click **Toggle Switch 1** to close it. Lamp glows (it also pulses gently while lit, unless reduced motion or Low-power is on). Show the 3D lamp, then scroll once so the **Circuit diagnostic** is on screen (it sits below the bench, not beside it): Status VALID, Battery 3.00 V, Lamp 1 3.00 V, 499.9 mA, state Energized. | "I close the switch. The lamp lights because the solver computed 3 volts and about 500 milliamps through it. The glow is read from that report, not scripted. This is a simplified DC model." | Solver output = visuals (3D + solver) |
| 1:10-1:20 | Click the switch again to open it. Lamp goes dark. Diagnostic lamp row shows "Idle" and the reason text changes. | "Open the switch and the path is broken, so the report says idle and the lamp goes dark." | Deterministic cause and effect |
| 1:20-1:40 | In **Ask Nova**, click **Ask for a hint**. Show the answer and the label "Local guide" and "1 of 3 tutor hints used." | "The tutor reads the same report. Right now it is the offline Local guide: no AI model is connected in this build. It only says what the circuit report supports." | Tutor grounded in solver state, honest about no model |
| 1:40-1:50 | Click **Schematic**, show the same circuit and the same lamp state; click **3D workbench** to return. | "The schematic view is a keyboard-friendly alternative on the same circuit state." | One shared state, accessibility path |
| 1:50-2:05 | Re-close the switch if needed so both outcomes have been seen. Choose "It interrupted the complete path." in the concept check, click **Check answer**, **Finish mission**. Dialog "Mission complete: Complete the Loop" appears. | "A concept check unlocks only after the lamp has lit and the switch was seen open and closed. Then the mission completes." | Mission state machine gating |
| 2:05-2:20 | Click **Next mission: Fix the Fault**, start it. Show the lamp dark and the diagnostic status/reason from the solver. | "Mission 2 starts with a missing return wire. The solver reports no energized path, and the learner has to find why." | Mission 2 driven by solver |
| 2:20-2:30 | Click **Back to missions**. Map shows "1 of 3 missions complete", Mission 1 "Status: Completed" (button now "Review Mission 1") and mission 3 locked. | "Mission 3 is about two lamps in parallel. It unlocks after mission 2, and is covered by our automated browser tests, which I will not replay here." | Honest glimpse, no fake play |
| 2:30-2:40 | Click **Erase my progress**, then **Erase everything**. Status text: "All saved progress on this device has been erased." | "Progress lives only in this browser. One button erases it." | Privacy (R8) |
| 2:40-2:45 | End card (static slide or browser on the GitHub repo showing the `.kiro` folder): live URL, GitHub URL, text "Built with Kiro specs and steering". | "Built with Kiro, using specs and steering files in the repo. Links are below." | Kiro evidence |

## What to show to prove the Frankenstein combination

Keep these visible, in this order, at least once each:

1. **3D**: the canvas with clickable ports and the glowing lamp (0:30-1:10).
2. **Solver**: the Circuit diagnostic table on screen right after the lamp lights and goes dark (0:55-1:20). At 1280x800 the stage and the table do not fit on one screen, so scroll between them.
3. **Tutor**: the Ask Nova answer with the "Local guide" label (1:20-1:40).
4. **Missions**: objectives checklist ticking, the concept check, the completion dialog, and the map progress (1:50-2:30).
5. A single on-screen caption during 0:55-1:10: "3D bench + solver report + tutor + missions share one circuit state".

## Claims to avoid in the video and captions

- "AI-powered tutor" without saying it is the offline Local guide.
- "Accurate physics". Say "simplified DC model".
- Any number of users, ratings, classroom results or speed benchmarks. None exist.
- "Works on phones and tablets". It was tested in Chrome emulation only (docs/18).
- "Accessible to screen reader users". No screen-reader test has been done (docs/17).
- Mission 3 gameplay, unless you actually play it on camera.

## If something fails during the take

Stop, note what failed, and file it. If the live site misbehaves, say so in the Devpost "limitations". Do not splice in a different run to hide it.
