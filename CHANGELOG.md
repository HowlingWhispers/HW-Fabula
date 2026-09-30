# Changelog

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
