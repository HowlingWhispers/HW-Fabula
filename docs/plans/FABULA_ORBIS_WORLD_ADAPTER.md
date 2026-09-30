# Fabula Orbis World Adapter

Status: runnable pre-alpha foundation  
Runtime revision: 0.3

## Purpose

Fabula needs to inhabit real Orbis worlds without making Orbis database structure part of Fabula's simulation core.

The 0.3 world adapter establishes the first live read boundary:

```text
Orbis Library API
      ↓
OrbisAdapter
      ↓
normalized world + canonical Places
      ↓
WorldSession
      ↓
FabulaRuntime
      ↓
replaceable desktop/mobile client
```

Bitterroot is the first default world used by the reference client. The engine never tests for the name `Bitterroot` and contains no Bitterroot-specific movement rules.

Praxis is unrelated to this architecture and is not a dependency.

## Orbis read contract

The adapter uses the existing Orbis Library API rather than creating a second world format:

- `GET /v1/library/assets?type=world`
- `GET /v1/library/assets/:worldId`
- `GET /v1/library/assets/:worldId/children`

The world record provides broad canonical metadata. The children endpoint provides canonical world entities. In this first playable slice, Fabula consumes the `locations` collection as authoritative Places.

Each Place keeps both identities when Orbis supplies them:

- stable world entry ID
- Library asset ID

Fabula resolves either identity but stores the world entry ID in private runtime state.

## Starting Place

A new Fabula instance must be physically anchored to a canonical Place before actions are accepted.

The reference client loads all canonical Places in the selected world and lets the player choose a starting Place. The runtime validates that the Place actually belongs to the loaded Orbis world.

Starting location is authoritative state. It is not a prose hint.

## 0.3 movement boundary

The first movement implementation is intentionally conservative.

A Place is directly reachable when it is:

- the canonical parent of the current Place, or
- a canonical child of the current Place.

This means a settlement can contain a bakery, market, home, or other authored sub-place and Fabula can enter and leave those Places without inventing geography.

`TRAVEL TO <place>` may identify a remote canonical Place, but if no canonical route is loaded the action is rejected. Fabula does not silently teleport the player and does not invent a travel duration.

A later travel adapter will consume authored routes, terrain, distance, transport, weather, encounters, and travel-time rules.

## Deterministic action slice

Before the AI action interpreter is connected, the 0.3 runtime understands a small deterministic command surface:

- `LOOK`
- `WHERE AM I`
- `INSPECT`
- `ENTER <adjacent place>`
- `GO TO <adjacent place>`
- `LEAVE`
- `BACK`
- `TRAVEL TO <canonical place>`
- `HELP`

Unknown freeform input is recorded as a turn but cannot mutate authoritative state.

This is deliberate. Generated prose or an untrusted language model must never gain write authority merely because the deterministic interpreter does not understand a sentence.

## Information boundary

Loading an Orbis world into the runtime does not make all world text player knowledge.

The current 0.3 scene projection exposes:

- current Place identity and canonical description
- structural parent/child exits
- breadcrumb ancestry
- private turn history

It does not narrate descriptions of arbitrary remote Places simply because they are present in the adapter cache.

This is the first small implementation of the broader perception/knowledge architecture described in `FABULA_AI_RUNTIME.md`.

## Saves

The reference client stores a versioned private Fabula save in browser local storage.

The save includes:

- world ID
- player and instance IDs
- current Place ID
- visited Place IDs
- deterministic turn history
- local scene-transition tick
- Influence wallet
- private instance facts
- proposals and local Canon Ledger revisions

On restore, Fabula reloads the world from Orbis first. If the saved current Place no longer exists in canonical data, restoration fails rather than silently moving the player elsewhere.

## Influence integration

The first visit to a canonical Place currently awards a small validated exploration milestone through the existing Influence system.

This proves that real world traversal and the Canon Ledger can share one runtime process.

Raw message count still awards nothing.

## Mobile contract

The reference client remains replaceable, but the 0.3 client treats phones as a primary target:

- single-column scene layout
- bottom navigation
- safe-area padding
- large touch targets
- horizontal quick-action strip
- sticky action composer above phone navigation
- Place exit cards rather than wide tables
- dialogs constrained to the viewport
- no hover-only action

Simulation rules remain in `src/`, not in responsive UI handlers.

## Local Orbis bridge

The pre-alpha Node server exposes a narrow same-origin read bridge at `/api/orbis` so the browser does not need direct cross-origin access to Orbis.

The bridge:

- accepts only `GET` and `HEAD`
- exposes only `/v1/library/*`
- forwards no user credentials
- defaults to `https://lib.thehowlingwhispers.com`
- can be pointed at another Orbis origin through `ORBIS_API_URL`

This is sufficient for public/readable worlds such as public Bitterroot canon.

It is not the final authenticated service-to-service design.

## Canon write-back boundary

0.3 reads real Orbis canon but does **not** write approved Fabula proposals back to Orbis yet.

Local proposal approval exercises the Fabula Canon Ledger only. The client states this explicitly.

The production write path needs a server-side Canon Adapter that can:

1. authenticate the Fabula service/user safely;
2. submit a structured proposal rather than a private transcript;
3. validate ownership and curator authority;
4. check current Orbis revision and conflicts;
5. write through Orbis's single authoritative asset/world-child write path;
6. return the resulting Orbis revision and stable IDs to Fabula.

Until that exists, Fabula must never claim that a local approval changed official Orbis canon.

## Next runtime expansion

After this foundation, the next playable layer is the AI/mechanics turn pipeline:

```text
freeform player text
      ↓
AI intent candidate
      ↓
Fabula validation
      ↓
dice / skills / inventory / time / travel rules
      ↓
authoritative transaction
      ↓
perception projection
      ↓
AI narrative rendering
      ↓
output audit
```

The Orbis adapter remains the canon source underneath that pipeline.
