# Changelog

## 0.5.0-prealpha.1 - 2026-09-30

### Added
- Canonical NPC loading through the Orbis world adapter, with NPCs normalized and mapped by stable identity alongside Places.
- NPC identity resolution by canonical ID, Library asset ID, full name, and alias, including exact-name-only matching that never invents a record from a partial token.
- Deterministic NPC presence model: an NPC is present at a Place only when a canonical `locationId`, `workLocationId`, `homeLocationId`, or explicit `presences` entry names that Place. Presence is never inferred from a Place description's text.
- Freeform conversation routing. Player input of the form `TALK TO <npc>`, `SPEAK TO <npc>`, `ASK <npc> ABOUT <topic>`, `TELL <npc> THAT <...>`, `<npc name>, <message>`, or `<npc name> <message>` now resolves the referenced NPC and checks canonical presence before routing.
- Private relationship/memory state. Each conversation with a present NPC records a private per-instance interaction summary (interaction count, affinity, last contact turn, recent intents) that is never promoted to canon without explicit player action.
- Runtime event `conversation.requested` carrying the structured context (referenced NPC, detected intent, presence, place, relationship state, and a correlation request id) so the later AI narrative layer can render prose without re-deriving presence.
- `npc-not-present` outcome when a resolved NPC is referenced but is not canonically present at the current Place, with no state change and no summoning of the character.
- Reference client surfaces canonical characters who are actually present at the current Place and lets the player start a conversation by tapping a name.
- Regression coverage for NPC resolution, canonical presence (not prose) gating, the Brackenjaw Ranger Station guardrail, conversation intent classification, relationship accumulation, save/restore of relationships, and end-to-end `conversation.requested` emission.

### Changed
- `FabulaRuntime.act` now emits `conversation.requested` for routed conversations in addition to the existing turn lifecycle events.
- `WorldSession.snapshot` now exposes `presentNPCs` and `relationships` for the current Place.
- Fabula version advances to `0.5.0-prealpha.1`.

### Architecture
- NPC presence verification is an explicit, resolvable fact in the runtime rather than a prose inference. This is the foundation that keeps future AI prose generation from hallucinating a character into a scene.
- NPC dialogue/narrative rendering remains a later runtime layer. The 0.5 turn records the verified interaction and emits structured context; it does not fabricate NPC speech.
- The Orbis adapter canonicalizes NPC location references the same way it already canonicalizes Place parent links, so presence checks compare canonical Place IDs.

## 0.4.0-prealpha.1 - 2026-09-30

### Added
- Three explicit shared-history layers: immutable authored canon, approved player canon, and optional non-canon community content.
- Per-player/per-world canon view modes: `clean`, `player-canon`, and `community`.
- Permanent `player-canon` provenance on approved player contributions so they never masquerade as world-author material.
- `community` publication path for worlds that explicitly allow optional non-canon shared content.
- Separate community revision tracking so optional material never advances official canon revision numbers.
- World policy switches for accepting player-canon submissions and enabling the community layer.
- Player-canon ticket queue limits and per-player community publication limits as anti-spam/storage controls.
- Influence costs for community publication, with a configurable multiplier.
- Runtime save persistence for the player's selected canon view mode.
- Runtime snapshots exposing canon policy, community facts, selected view mode, and filtered shared contribution facts.
- Regression coverage for disabled submissions, ticket caps, community opt-in, layer filtering, provenance flags, and legacy Canon Ledger state migration.

### Changed
- Canon proposals are now explicitly targeted at the `player-canon` layer.
- Approved player contributions are marked `canonical: true` and `canonLayer: player-canon`.
- Community contributions are marked `canonical: false` and `canonLayer: community`.
- Canon Ledger state advances to schema version 2 while retaining import support for schema version 1.
- Fabula save state advances to schema version 3 while older saves remain readable.
- The Canon Ledger architecture document now treats bounded ticketing as the first governance model instead of assuming large-scale automated moderation.

### Architecture
- Clean Canon is a player-side filter, not a destructive rewrite of shared history.
- Orbis-authored material remains the baseline and is never relabeled as player canon.
- Storage location, hosting model, and canon status remain separate concerns.
- Praxis remains separate and is not a Fabula dependency.

### Still gated
- The production Orbis write adapter must preserve these layer/provenance fields when approved or community records are eventually stored in Orbis.
- World-owner policy editing is not yet exposed through Orbis UI.
- Shared player/community records are not yet injected back into live Orbis-backed scenes.

## 0.3.0-prealpha.4 - 2026-09-30

### Fixed
- Point the Fabula Orbis adapter at Orbis's real mounted Library API under `/api/v1/library` instead of the stale `/v1/library` path.
- Update the read-only Fabula server bridge to allow and forward only `/api/v1/library` reads.
- Reject successful non-API/HTML responses instead of silently interpreting them as an empty world list and showing a false `Orbis live` state.
- Add regression coverage for the mounted Orbis Library path and unexpected successful page responses.

## 0.3.0-prealpha.3 - 2026-09-30

### Fixed
- Keep the browser's native `fetch` bound to `globalThis` so Chromium/Opera does not throw `Illegal invocation` when Fabula calls Orbis.
- Add a regression test that fails if platform fetch is detached from its native receiver.

## 0.3.0-prealpha.2 - 2026-09-30

### Fixed
- Normalize Place parent links that arrive as Orbis Library asset IDs back to canonical world-entry IDs before traversal.
- Preserve the previous browser save while Fabula is still loading/restoring, so a failed canonical restore cannot overwrite the recoverable save with an empty session.
- Recover player/instance identity from an existing save if the separate browser profile key is missing.
- Correct local review feedback text for rejected proposals.

## 0.3.0-prealpha.1 - 2026-09-30

### Added
- Generic Orbis Library read adapter for live world and world-child loading.
- Bitterroot as the reference client's default live Orbis world without hard-coding Bitterroot into the runtime.
- Canonical starting Place selection with stable Orbis IDs.
- `WorldSession` for private authoritative location, visits, turn history, Place ancestry, and structural exits.
- Deterministic text actions for looking, inspecting, parent/child movement, leaving, and conservative travel checks.
- Explicit refusal to invent remote routes, teleportation, or fake travel duration when Orbis has not supplied a route.
- Versioned Fabula save/resume that revalidates the saved Place against current Orbis canon.
- First-visit exploration milestones wired into Influence.
- Same-origin, read-only Orbis proxy for the pre-alpha browser client.
- New phone-first play interface with start-place selection, touch exits, bottom navigation, and sticky action composer.
- `FABULA_ORBIS_WORLD_ADAPTER.md` architecture and deployment boundary documentation.
- Automated tests for Orbis normalization, starting anchors, movement, route refusal, freeform no-op safety, and save restoration.

### Changed
- Replaced the synthetic Shared World Demo play surface with a real Orbis-backed world session.
- Fabula version advances to `0.3.0-prealpha.1`.
- The client now clearly distinguishes real Orbis reads from local-only Canon Ledger review.

### Not yet implemented
- Authenticated Canon Ledger write-back into Orbis.
- AI freeform action interpretation and narrative generation.
- Full dice/skills, inventory/economy, travel-time, encounter, NPC, and perception pipelines.

### Architecture
- Fabula remains the runtime authority for private mutable play state.
- Orbis remains the canonical backing source through an adapter contract.
- Praxis remains a separate project and is not a Fabula dependency.

## 0.2.0-prealpha.1 - 2026-09-30

### Added
- First runnable Fabula prototype rather than architecture-only documentation.
- UI-neutral Canon Ledger runtime for private instance facts, Influence, proposals, review, canonization, provenance, revisions, and sync.
- Weekly Influence earning caps and impact-scaled proposal costs.
- Canon conflict hints and owner/curator review gates.
- Explicit privacy boundary: private transcripts are never part of a canon proposal payload.
- Browser persistence for the prototype through local storage.
- Mobile-first web client with safe-area support, large touch targets, single-column phone layout, and bottom navigation.
- Headless runtime events so a future redesigned GUI can be swapped in without moving simulation rules into the frontend.
- Automated runtime tests for Influence caps, proposal spending, privacy, permissions, conflicts, and revision updates.

### Architecture
- Fabula owns authoritative play state and the canon contribution workflow.
- Orbis remains the intended canonical backing store through a future adapter.
- This implementation is Fabula-specific and intentionally does not use Praxis architecture or concepts.
