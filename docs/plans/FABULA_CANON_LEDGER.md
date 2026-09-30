# Fabula Canon Ledger and Influence System

Status: runnable pre-alpha foundation  
Runtime revision: 0.2

## Purpose

Fabula allows each player to inhabit a private authoritative instance of a shared world while still giving those players a controlled path to leave durable marks on shared history.

The core loop is:

```text
Explore → Act → Resolve → Record → Earn Influence → Propose → Review → Canonize → Propagate → Encounter
```

Fabula owns the gameplay/runtime workflow. A Canon Adapter will later connect approved facts to Orbis or another canonical backing store.

This is a Fabula subsystem. It is intentionally independent of Praxis.

## Truth layers

### Instance truth
A durable fact produced by one player's authoritative Fabula instance. It is private to that player/instance by default.

### Proposed truth
A sanitized instance fact that the player chose to submit to the Canon Ledger by spending Influence.

### Canon truth
A reviewed and approved fact that is part of the shared world's official record.

Private transcripts are never promoted simply because a durable fact is proposed. The Canon Ledger stores structured provenance references instead.

## Influence

Influence is a world-contribution resource, separate from money, XP, stamina, reputation, or faction standing.

It is earned through validated play milestones such as meaningful exploration, quests, discoveries, roleplay milestones, and other runtime-confirmed achievements. Raw text/message volume must not be a source of Influence.

Each world can configure:

- starting Influence
- weekly earning cap
- auto-canon threshold for tiny changes
- curator review ceiling
- rejected-proposal refund policy

Proposal costs are calculated from impact rather than hard-coded to a particular world.

## Impact model

The current pre-alpha impact score combines:

- contribution type
- geographic/world scope
- whether existing canon is mutated
- destructive consequences
- settlement creation
- world-arc changes

The score is converted to an Influence cost. The formula is intentionally isolated inside the Canon Engine so later balancing will not require UI changes.

## Review authority

Influence buys the right to submit a proposal. It does not buy ownership of the world.

Current roles:

- `system`: may only approve below the configured automatic threshold
- `curator`: may approve below the configured curator impact ceiling
- `owner`: may approve any impact level

A world can later expose more governance models through Orbis without changing the base runtime contract.

## Privacy contract

A proposal contains a public payload with durable fields such as:

- type
- title
- summary
- scope
- stable subject key
- tags
- in-world date
- impact flags

Provenance contains opaque IDs such as origin instance, origin fact, proposer, and evidence references.

It does **not** contain the private roleplay transcript.

## Conflict hints

The pre-alpha engine checks explicit canon conflict references and same-subject mutations. A later Orbis adapter can add temporal, relationship, geography, ownership, and schema validation.

Conflict detection should help the reviewer. It must not silently rewrite history.

## Revisions and propagation

Each approved fact increments a world canon revision. Clients can request updates since a known revision.

This allows active Fabula instances to synchronize at safe boundaries instead of having shared reality mutate in the middle of a scene.

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
    ↓
proposal/review/revision records
    ↓
Canon Adapter
    ↓
Orbis canonical world record
```

Fabula should depend on an adapter contract, not on Orbis database internals.
