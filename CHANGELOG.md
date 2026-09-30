# Changelog

## 0.3.0-prealpha.3 - 2026-09-30

### Fixed
- Keep the browser's native `fetch` bound to `window`/`globalThis` inside the Orbis adapter. Chromium-family browsers can throw `TypeError: Failed to execute 'fetch' on 'Window': Illegal invocation` when the method is detached and later called with the adapter instance as its receiver.
- Added a regression test that deliberately simulates a browser fetch requiring the correct global receiver.

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
