# HW-Fabula

Fabula is the Howling Whispers home for Fabula-specific gameplay, AI runtime, and world-simulation design and implementation.

Current status: pre-alpha architecture / planning.

## Current plans

- `docs/plans/FABULA_AI_RUNTIME.md` — headless AI/runtime architecture, persona embodiment, five-sense perception, scoped context, output auditing, multiplayer privacy, and UI-neutral runtime boundaries.
- `docs/plans/FABULA_DEFERRED_EMERGENCE.md` — snapshot-based off-screen simulation, deferred place development, NPC private experience and beliefs, one-way observation, information propagation, and re-entry catch-up.
- `docs/plans/FABULA_NARRATIVE_DICE.md` — narrative dice and uncertain-action resolution plan.

Fabula-specific mechanics belong here rather than being stored in Orbis simply because Orbis is currently the more developed application.

The runtime must remain independent of the current GUI. Desktop, web, mobile, terminal, or later redesigned interfaces should be clients of the same runtime rather than owning simulation rules.

Canonical branch: `main`.
