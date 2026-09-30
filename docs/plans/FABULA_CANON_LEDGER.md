# Fabula Canon Ledger and Influence System

Status: runnable pre-alpha foundation  
Runtime revision: 0.4

## Purpose

Fabula allows each player to inhabit a private authoritative instance of a shared world while still giving those players a controlled path to leave durable marks on shared history.

The core loop is:

```text
Explore → Act → Resolve → Record → Earn Influence → Propose → Review → Canonize → Propagate → Encounter
```

Fabula owns the gameplay/runtime workflow. A Canon Adapter will later connect approved facts to Orbis or another canonical backing store.

This is a Fabula subsystem. It is intentionally independent of Praxis.

## The three shared-history layers

Fabula does not flatten every shared contribution into one bucket.

### Authored Canon (`authored-canon`)

The original world-author material stored in Orbis.

Authored canon is the baseline world record and is never relabeled as player canon. Player contributions may refer to or build on authored canon, but their provenance remains separate. A player selecting Clean Canon always receives this layer.

### Player Canon (`player-canon`)

A durable player-created fact that passed the world's submission and review process.

Approved player canon remains permanently marked as player-originated. It can become part of the persistent shared history without pretending that the world author originally wrote it.

### Community Layer (`community`)

Optional shared material that the world owner allows players to publish without promoting it to canon.

Community records are explicitly non-canonical. They may be discovered or used by players who opt into the Community view, but using them does not silently promote them to canon.

## Player view modes

The player chooses how much shared history Fabula may load for that world:

- `clean` — Authored Canon only.
- `player-canon` — Authored Canon plus approved Player Canon.
- `community` — Authored Canon plus approved Player Canon plus the optional Community Layer.

The preference is per player and per world. Switching to Clean Canon is a filter, not a deletion. Shared player history remains in the world record for players who want it.

## Truth workflow

### Instance truth
A durable fact produced by one player's authoritative Fabula instance. It is private to that player/instance by default.

### Proposal ticket
A sanitized instance fact that the player chose to submit for Player Canon by spending Influence.

### Reviewed Player Canon
A world owner or authorized curator approved the ticket. The resulting shared record receives `canonLayer: player-canon` and preserves player provenance.

### Community contribution
If the world owner enables the Community Layer, a player may spend Influence to publish a fact there without canon approval. The record receives `canonLayer: community` and `canonical: false`.

Private transcripts are never promoted simply because a durable fact is proposed or published. The Canon Ledger stores structured provenance references instead.

## World-owner policy

The Canon Engine currently supports:

- `acceptPlayerCanonSubmissions` — completely disable or enable Player Canon tickets.
- `allowCommunityLayer` — independently enable the non-canon Community Layer.
- `maxPendingProposalsPerPlayer` — cap open ticket spam before more Influence can be spent.
- `maxCommunityFactsPerPlayer` — cap immediate community publications per player.
- `communityInfluenceMultiplier` — tune the Influence cost of non-canon community material.
- `startingInfluence`.
- `weeklyInfluenceCap`.
- `autoApproveMaxImpact`.
- `curatorReviewMaxImpact`.
- `refundRejectedProposal`.

The production Orbis bridge should read these settings from the world owner's Fabula policy. Existing runtime defaults are a compatibility fallback, not a substitute for explicit owner configuration once write-back is live.

## Influence

Influence is a world-contribution resource, separate from money, XP, stamina, reputation, or faction standing.

It is earned through validated play milestones such as meaningful exploration, quests, discoveries, roleplay milestones, and other runtime-confirmed achievements. Raw text/message volume must not be a source of Influence.

Both Player Canon tickets and Community Layer publication can consume Influence. Community publication is not free simply because it skips canon approval; this keeps the optional layer from becoming a zero-cost spam channel.

## Impact model

The current pre-alpha impact score combines:

- contribution type
- geographic/world scope
- whether existing canon is mutated
- destructive consequences
- settlement creation
- world-arc changes

The score is converted to an Influence cost. The formula is isolated inside the Canon Engine so later balancing will not require UI changes.

## Ticketing and review authority

Influence buys the right to submit a Player Canon ticket. It does not buy ownership of the world.

Current roles:

- `system`: may only approve below the configured automatic threshold
- `curator`: may approve below the configured curator impact ceiling
- `owner`: may approve any impact level

For the first live version, the preferred governance model is intentionally simple: a bounded ticket queue plus owner/curator review. More elaborate voting or automation can be added later when real scale is known.

## Privacy contract

A shared contribution contains durable public fields such as:

- type
- title
- summary
- scope
- stable subject key
- tags
- in-world date
- impact flags
- contribution layer

Provenance contains opaque IDs such as origin instance, origin fact, proposer, and evidence references.

It does **not** contain the private roleplay transcript.

## Conflict hints

The pre-alpha engine checks explicit canon conflict references and same-subject mutations against Player Canon. A later Orbis adapter can add authored-canon conflict checks, temporal validation, relationships, geography, ownership, and schema validation.

Conflict detection should help the reviewer. It must not silently rewrite history.

## Revisions and propagation

Each approved Player Canon fact increments the canon revision.

Community records use their own community revision sequence and do not advance official canon revision numbers.

This separation prevents optional non-canon material from masquerading as official world history and lets active Fabula instances synchronize at safe boundaries instead of mutating reality in the middle of a scene.

## Storage and scale boundary

The first implementation uses bounded tickets and bounded community publication rather than assuming unlimited storage.

Future storage policy can add:

- world contribution quotas
- archival/compaction rules
- per-world storage budgets
- owner-provided hosting or external object storage
- cold storage for old community layers

Those concerns must not change the canonical meaning of a record. Storage location and canon status are separate questions.

## Mobile / UI contract

The included web client is a replaceable reference client. Runtime rules remain in `src/`.

Phone requirements in the reference client:

- single-column content below 760 px
- bottom navigation
- touch targets around 44–48 px minimum
- safe-area padding for phone home indicators
- no required hover interaction
- cards instead of wide data tables
- dialogs constrained to viewport height
- no simulation rule implemented only in UI code

## Orbis integration seam

The intended adapter boundary is:

```text
Fabula private instance
    ↓
Canon Engine
    ├── Player Canon ticket → review → approved player-canon record
    └── optional community publication → community record
    ↓
Canon Adapter
    ↓
Orbis shared world record
```

Orbis must preserve the layer/provenance flags when shared records are eventually written back.

Fabula should depend on an adapter contract, not on Orbis database internals.
