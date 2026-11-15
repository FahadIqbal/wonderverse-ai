# Mission content pack

## Mission 1 — Complete the Loop
Opening: "Nova's city is dim. Can you make one lamp glow?" Parts: battery 3V, 6Ω bulb, switch, wires. Objective: connect series path and demonstrate opened vs closed switch. Three hint levels: `Find the path` → `Every circuit needs a return route` → `Trace battery + → switch → bulb → battery -`. Success evidence: valid energized bulb, learner toggled switch, answered concept check. Quiz: "Why did opening the switch turn off the lamp?" Correct: "It interrupted the complete path." Misconception: "It used all the electricity."

## Mission 2 — Fix the Fault
Opening: "The museum lamp went out. Diagnose the circuit." Prefilled graph missing one edge; solver returns `MISSING_RETURN_PATH`. Learner investigates and reconnects return wire. Success evidence: invalid→valid state transition triggered by learner fix, correct diagnosis selection. Distractor: "The bulb needs more colors." Never randomly choose fault; seeded deterministic fixture.

## Mission 3 — Light the City
Opening: "Light two neighborhoods so one street can go dark while the other stays on." Build parallel lamps. Success evidence: both lit, toggling one branch switch leaves other lit, correct branch explanation. Supply correct switch/parts and intentionally illustrate series as a learning contrast. Do not require arbitrary unsupported graph topology.

## Outcomes recap
`You built: [topology]`, `You observed: [engine truth]`, `You explained: [quiz concept]`, `Try next: [new challenge]`. Words grounded in state; no fabricated score. Progress badges based on achievements not elapsed time or uncontrolled AI judgments.

## Approved science facts
A closed path enables current in a simple idealized circuit. Opening a series switch interrupts current. Parallel loads have separate branches across a common voltage source. Current and voltage values depend on the modeled voltage and resistance. Real electrical systems can be dangerous; the app is not a wiring guide.
