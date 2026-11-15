# Vision, positioning & scope

## North star
**WonderVerse AI: the laboratory that responds to what you build.** Kids learn circuitry by assembling components, seeing reliable cause/effect, receiving Socratic hints, and proving mastery in an immersive mission to restore light to a city.

## Frankenstein fit
Fuse technologies that are normally disconnected: (1) real-time 3D direct manipulation, (2) electrical network graph modeling, (3) deterministic rule/solver engine, (4) grounded LLM tutoring, (5) mastery-based game state. The **same experiment state** drives visuals, AI explanations, and mission scoring; this unified state is the key differentiator.

## Audience & jobs-to-be-done
- Learner, 10–14: `Help me safely understand why my circuit works or fails.`
- Parent/educator: `Let me see what concepts the learner has actually demonstrated.`
- Judge: `Let me try a complete, polished experiment immediately without setup or credentials.`

## Hackathon vertical slice
1. Landing/portal world with one clear CTA.
2. 3D lab: drag/place/connect battery, switch, wire, bulb, and optional second bulb; camera orbit/pan/reset, keyboard accessible fallback.
3. Circuit solver outputs connectivity, voltage/current estimates under simplified DC assumptions, element energized state, and reason codes.
4. Real-time bulb and cable visuals reflect truth from solver; no hardcoded success animation.
5. Contextual AI tutor with safe hints + deterministic local fallback; never invent physical readings.
6. Three missions: Complete the Loop, Fix the Fault, Light the City; progression based on solver-backed events.
7. Session persistence, progress recap, replay/reset, mobile/tablet graceful adaptation, guest demo.

## Non-goals until MVP passes
Chemistry simulation, VR/AR, generative 3D meshes, social chat, multiplayer, classroom SaaS, authentication, telemetry involving children, advanced circuit analysis, arbitrary AC circuits, STEM claims of proven learning efficacy.

## Success thresholds (targets, not established results)
- Unassisted completion of mission 1 by pilot learners in <= 5 minutes.
- All three missions demoable end-to-end without a network connection (AI fallback mode).
- Typical lab interactions respond within a frame; solver <= 30ms on validated MVP graph sizes.
- WCAG-aware navigation, visible focus, reduced-motion option; no critical keyboard blockers.
- 0 showstopper bugs and 0 invented tutoring measurements.

## Scope priority
P0 = stable lab + solver + 3 missions + guided hints + saved progression + deploy. P1 = voice narration, richer particle/effects, progress analytics. P2 = invention freeplay, biology, chemistry, VR.
