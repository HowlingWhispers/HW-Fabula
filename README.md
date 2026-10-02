# HW-Fabula

Fabula is the Howling Whispers home for authoritative gameplay, AI runtime, private player instances, Influence, and persistent shared-world history.

Current status: **pre-alpha playable world foundation with layered shared history**.

Current version: **0.5.0-prealpha.1**

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
- canonical NPC loading from Orbis with deterministic identity resolution (name, alias, ID)
- deterministic NPC presence model gated on canonical Place assignment, never prose inference
- freeform conversation routing (TALK TO / ASK / TELL / addressed speech) to a present NPC only
- private per-instance NPC relationship/memory state that never promotes to canon automatically

### Canon contribution foundation

- headless Canon Ledger runtime
- private instance facts
- Influence earning with weekly caps
- impact-scaled proposal costs
- simple bounded ticket queue for Player Canon submissions
- owner/curator review gates
- permanent player-origin provenance on approved Player Canon
- optional Community Layer that remains explicitly non-canonical
- separate canon and community revision streams
- anti-spam limits for pending tickets and community publication
- privacy-preserving provenance without private transcript leakage
- conflict hints for canon mutations

### Shared-history modes

Fabula now separates shared history into three layers:

- **Authored Canon** — the original world-author record from Orbis.
- **Player Canon** — approved player-created history, permanently flagged as player-originated.
- **Community** — optional shared non-canon content that a world owner may allow.

Players can select a per-world view mode:

- `clean` — Authored Canon only.
- `player-canon` — Authored Canon + approved Player Canon.
- `community` — Authored Canon + Player Canon + optional Community content.

Clean Canon is a filter. It does not delete shared player history or rewrite the world record.

### World-owner contribution policy

The runtime can enforce:

- accepting or refusing Player Canon submission tickets
- enabling or disabling the Community Layer separately
- maximum open tickets per player
- maximum community contributions per player
- Influence cost scaling for community publication
- weekly Influence caps
- automatic low-impact approval threshold
- curator approval ceiling

The production Orbis UI for editing these policies is still to be built.

### Client foundation

- phone-first web client
- bottom navigation on small screens
- touch-friendly canonical Place exits
- safe-area support
- sticky text-action composer
- replaceable UI over a headless runtime

## Current boundary

Fabula **reads real Orbis canon** and now verifies canonical NPC presence against structured world data before routing conversation.

NPC presence is an explicit, resolvable fact in the runtime. An NPC is treated as present at a Place only when an Orbis record assigns them to it (`locationId`, `workLocationId`, `homeLocationId`, or `presences`). The place description text alone never summons a character, so a line like *"Ragna I need to speak to you"* routes to a real, canonically-present NPC or returns `npc-not-present` — it never hallucinates presence.

Private relationship/memory state is recorded per instance and is never promoted to Player Canon or Community without explicit player action. Shared-history layers still remain inside Fabula's local pre-alpha ledger and do not write back into Orbis yet.

NPC dialogue/narrative rendering is still a later runtime layer. The 0.5 turn records the verified interaction and emits a structured `conversation.requested` event with the limited, presence-checked context the prose layer needs — it does not fabricate NPC speech.

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
- `docs/plans/FABULA_CANON_LEDGER.md` - private instance → Influence → bounded ticket/community contribution → shared-history layers → propagation architecture.
- `docs/plans/FABULA_ORBIS_WORLD_ADAPTER.md` - live Orbis world loading, starting Place anchoring, movement boundary, saves, mobile client, and future canon write-back seam.

## Architectural rule

The runtime owns rules. The GUI is a client.

Desktop, web, mobile, terminal, or a future redesigned interface must be able to use the same Fabula runtime without moving simulation authority into presentation code.

Orbis is the canonical world source through an adapter boundary. Fabula mechanics stay in Fabula.

**Praxis is a separate project. This repository does not depend on Praxis and should not absorb Praxis architecture.**

Canonical branch: `main`.
