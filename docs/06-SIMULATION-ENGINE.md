# Electrical simulation specification (MVP fidelity)

## Purpose
A **bounded simplified DC model**, not SPICE or a real electronics safety simulator. Supported: 1 ideal DC battery (3V default), fixed resistive lamps, ideal switch, ideal wire, simple series/parallel resistive networks. Not supported: AC, capacitors, inductors, semiconductor devices, transients, arbitrary component combinations.

## Core algorithm
1. Validate component ids, terminals, allowed types, edge endpoints and resource limits.
2. Build electrical graph. Merge ideal wire connections using disjoint-set union. Closed switches merge nodes; open switches are disconnected.
3. Detect disconnected paths, battery polarity misuse where relevant, and direct battery terminal short (zero-resistance bypass) **before** network solving.
4. For resistive subgraph, ground battery negative and set positive terminal to configured voltage. Use nodal analysis (Kirchhoff current law) for unknown node voltages, or an explicitly bounded series/parallel reduction if sufficient for all authored missions.
5. Compute branch current `I = (Va - Vb)/R`, power `P = I²R`; lamp `on = P >= threshold` with calibrated visualization mapping; no artificial glow from a button.
6. Return reason codes, solved values, and warnings. Reject negative resistance, unsupported topology and unstable/ill-conditioned systems.

## Example reference values
3 V source, single 6 Ω lamp ⇒ 0.5 A; two 6 Ω lamps in series ⇒ 0.25 A in each; two 6 Ω lamps in parallel ⇒ 0.5 A per lamp and 1.0 A battery total. These are idealized values and UI should label them as such.

## Constraints and safety
Max 20 components, 40 wires, 1 battery; source short must suppress energization and show `SHORT_CIRCUIT`. Choose maximum allowed battery current, e.g. 2 A, as a **virtual design constraint**, not real engineering safety guidance. Stable deterministic results for equivalent graph permutations. Cache by canonical graph fingerprint. Debounce only visual transitions, never scientific truth.

## Required property tests
- Reordering wires/parts leaves solved physical results unchanged.
- Opening the only series switch makes current zero.
- Removing a required return wire breaks the loop.
- Adding another equal-resistance parallel lamp increases total source current (within model).
- Never return NaN/Infinity for any validated input.
- Direct wire across battery produces short reason code and safe disabled state.
- Swapping UI positions never changes solved state.

## Graph fixtures
`empty`, `one-lamp-series-closed`, `one-lamp-series-open`, `missing-return`, `direct-short`, `two-lamps-series`, `two-lamps-parallel`, `invalid-terminal`, `duplicate-wire`, `isolated-subgraph`. Build fixtures as code and compare exact diagnostics / numerical outputs with tolerance 1e-6.
