# HW-Fabula

Fabula is the Howling Whispers home for authoritative gameplay, AI runtime, private player instances, and persistent shared-world history.

Current status: **pre-alpha runnable foundation**.

## What is implemented

- headless Canon Ledger runtime
- private instance facts
- Influence earning with weekly caps
- impact-scaled proposal costs
- owner/curator review gates
- canon revisions and update feeds
- provenance without private transcript leakage
- conflict hints for canon mutations
- browser persistence for the prototype
- mobile-first reference UI
- runtime tests

## Run the pre-alpha client

Requires Node 20+.

```bash
npm run dev
```

Then open `http://localhost:4173`.

Run tests with:

```bash
npm test
```

## Current plans

- `docs/plans/FABULA_AI_RUNTIME.md` — authoritative AI/runtime architecture, persona embodiment, perception, scoped context, output auditing, multiplayer privacy, and UI-neutral runtime boundaries.
- `docs/plans/FABULA_DEFERRED_EMERGENCE.md` — snapshot-based off-screen simulation and deferred place/NPC development.
- `docs/plans/FABULA_NARRATIVE_DICE.md` — narrative dice and uncertain-action resolution.
- `docs/plans/FABULA_CANON_LEDGER.md` — private instance → Influence → proposal → review → canon → propagation architecture.

## Architectural rule

The runtime owns rules. The GUI is a client.

Desktop, web, mobile, terminal, or a future redesigned interface must be able to use the same Fabula runtime without moving simulation authority into presentation code.

Orbis is the intended canonical backing store through an adapter boundary. Fabula mechanics stay in Fabula.

**Praxis is a separate project. This repository does not depend on Praxis and should not absorb Praxis architecture.**

Canonical branch: `main`.
