# Changelog

All notable Fabula Pre-Alpha changes are recorded here.

Fabula uses explicit prototype version bumps. Player-visible milestones, runtime architecture changes, persistence changes, and rule-system changes must update both `package.json` and `src/version.mjs`. CI checks that those versions stay in sync.

## 0.0.4-prealpha — 2026-09-28

### Added
- Shared runtime version source in `src/version.mjs`.
- Version-sync regression test so the package version and displayed application version cannot silently drift apart.
- This changelog as a required part of future milestone work.

### Changed
- Browser UI version is no longer hardcoded independently from the runtime version.

## 0.0.3-prealpha — 2026-09-28

### Added
- World-package architecture with validation.
- Bitterroot moved into `worlds/bitterroot-demo/` as demo content instead of Fabula core logic.
- Package-defined currencies, skills, intents, actions, modifiers, consequences, resource limits, and starting state.
- Synthetic non-Bitterroot `Orbital Test` package used to verify runtime portability.
- Six manual local save slots plus autosave.
- World-scoped save namespaces.
- One-way migration from the 0.0.2 browser save.
- GitHub Actions test workflow.
- `docs/WORLD_PACKAGES.md`.

### Changed
- Core resolution and roleplay APIs now receive a world package explicitly.
- Currency and fatigue displays became package-driven rather than Bitterroot-specific.

## 0.0.2-prealpha — 2026-09-28

### Added
- Roleplay-first interface with a dominant scene transcript and freeform `WRITE TO THE WORLD` composer.
- Enter-to-send and Shift+Enter-for-newline behavior.
- Persistent player turn transcript.
- Conservative intent recognition that only invokes mechanics when a recognized uncertain action requires them.
- Structured narration payload for the future Speculus/provider bridge.

### Changed
- Replaced the original GM/debug-dashboard-first interface with roleplay as the primary player experience.
- State, inventory, mechanical receipts, and diagnostics moved to secondary views.

## 0.0.1-prealpha — 2026-09-28

### Added
- First runnable Fabula prototype.
- Serializable demo world state.
- World clock and decimal age derived from a birth-world timestamp.
- Health, fatigue, inventory, durability, and money state.
- Deterministic seeded narrative dice.
- Success/failure, advantage/threat, and major positive/negative result channels.
- Persistent consequence mutations and inspectable receipts.
- Initial dark slate/cyan live-world console UI.

### Notes
- This first version was a mechanical proof of concept and was not yet shaped correctly around Fabula's roleplay-first identity.
