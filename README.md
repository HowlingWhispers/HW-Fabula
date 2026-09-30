# HW-Fabula

Fabula is the Howling Whispers home for authoritative gameplay, AI runtime, private player instances, and persistent shared-world history.

Current status: **pre-alpha playable world foundation**.

Current version: **0.3.0-prealpha.2**

## What is implemented

### Live world foundation

- generic Orbis Library read adapter
- Bitterroot as the reference client's default live Orbis world
- canonical world and Place loading by stable IDs
- player-selectable starting Place
- authoritative private location state
- parent/child Place traversal
- deterministic text commands for look, inspect, movement and route checks
- refusal to invent remote routes or travel times
- versioned local save/resume
- first-visit exploration milestones feeding Influence

### Canon contribution foundation

- headless Canon Ledger runtime
- private instance facts
- Influence earning with weekly caps
- impact-scaled proposal costs
- owner/curator review gates
- canon revisions and update feeds
- provenance without private transcript leakage
- conflict hints for canon mutations

### Client foundation

- phone-first web client
- bottom navigation on small screens
- touch-friendly canonical Place exits
- safe-area support
- sticky text-action composer
- replaceable UI over a headless runtime

## Current boundary

Fabula **reads real Orbis canon** in 0.3.

Approved Canon Ledger proposals still remain inside Fabula's local pre-alpha ledger. They do not write back into Orbis yet. The production Canon Adapter and owner/curator write endpoint are the next server-side integration boundary.

The freeform AI action interpreter, NovelAI narrative generation, dice/skills, inventory/economy, detailed travel time, encounters, NPC runtime and full perception engine are also later runtime layers. Unknown freeform commands currently make no authoritative state change.

## Run the pre-alpha client

Requires Node 20+.

```bash
npm run dev
```

Then open:

```text
http://localhost:4173
```

By default the local Fabula server reads public world data from:

```text
https://lib.thehowlingwhispers.com
```

To point it at another Orbis deployment:

```bash
ORBIS_API_URL=https://your-orbis.example npm run dev
```

Run tests with:

```bash
npm test
```

## Current architecture plans

- `docs/plans/FABULA_AI_RUNTIME.md` - authoritative AI/runtime architecture, persona embodiment, perception, scoped context, output auditing, multiplayer privacy, and UI-neutral runtime boundaries.
- `docs/plans/FABULA_DEFERRED_EMERGENCE.md` - snapshot-based off-screen simulation and deferred place/NPC development.
- `docs/plans/FABULA_NARRATIVE_DICE.md` - narrative dice and uncertain-action resolution.
- `docs/plans/FABULA_CANON_LEDGER.md` - private instance -> Influence -> proposal -> review -> canon -> propagation architecture.
- `docs/plans/FABULA_ORBIS_WORLD_ADAPTER.md` - live Orbis world loading, starting Place anchoring, movement boundary, saves, mobile client, and future canon write-back seam.

## Architectural rule

The runtime owns rules. The GUI is a client.

Desktop, web, mobile, terminal, or a future redesigned interface must be able to use the same Fabula runtime without moving simulation authority into presentation code.

Orbis is the canonical world source through an adapter boundary. Fabula mechanics stay in Fabula.

**Praxis is a separate project. This repository does not depend on Praxis and should not absorb Praxis architecture.**

Canonical branch: `main`.
