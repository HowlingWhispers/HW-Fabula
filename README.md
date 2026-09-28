# HW-Fabula

Fabula is the Howling Whispers gameplay and persistent world-simulation runtime.

**Current status: Pre-Alpha 0.0.4 prototype.**

Fabula is roleplay-first. The player writes naturally to the world. Fabula preserves that turn, checks authoritative world and character state, resolves only actions that genuinely need mechanics, persists the result, and prepares an immutable narration payload for the story layer.

The simulation is underneath the roleplay, not the main user interface.

For now Fabula is intentionally standalone. There is no Orbis dependency or server integration in this prototype.

## Versioning and changelog

Fabula uses explicit Pre-Alpha version bumps. The runtime version lives in `package.json` and `src/version.mjs`; CI verifies they stay in sync.

See `CHANGELOG.md` for the milestone history and release notes.

## Run

Requires Node.js 20 or newer.

```bash
npm start
```

Open `http://localhost:4173`.

## Test

```bash
npm test
```

The repository also runs the same test command through GitHub Actions on Pre-Alpha pushes and pull requests.

## Current prototype

- dominant roleplay transcript and freeform composer
- Enter sends / Shift+Enter inserts a new line
- loadable world-package boundary
- Bitterroot moved into `worlds/bitterroot-demo/` as demo data rather than Fabula core
- package-defined currencies, skills, intents, actions, modifiers and consequence configuration
- generic runtime instance state created from a supplied world package
- six local manual save slots plus autosave
- saves scoped by world ID
- one-way migration from the 0.0.2 local browser state
- conservative pre-alpha intent adapter for demonstration actions
- world clock, health, fatigue, balances and inventory
- decimal age from a birth-world timestamp
- deterministic recorded dice seeds
- independent success/failure and advantage/threat dimensions
- major positive/negative result channels
- mechanical state mutations and event log
- state, inventory and diagnostics kept secondary to the roleplay
- structured narration payload carrying the player turn, world state and mechanical receipts
- narrator authority boundary: describe results, never override mechanics or create canon
- synthetic non-Bitterroot test world to catch accidental core coupling
- shared application version source and version-sync regression test
- player-visible changelog link in the prototype UI

The local narration shown for resolved demo actions is only a mechanical preview. The real prose response belongs to a later Speculus/provider narration bridge.

## Runtime direction

The intended loop is:

```text
world package + saved instance
        ↓
player roleplay
        ↓
intent / uncertainty detection
        ↓
authoritative Fabula state
        ↓
mechanical resolution only when required
        ↓
persistent state mutation
        ↓
immutable receipt
        ↓
future narration bridge
        ↓
next roleplay turn
```

## Near-term standalone development

Before tying Fabula to Orbis or installing it on the server, the local runtime should become useful on its own. The next gameplay targets are:

1. proper travel state and movement between package-defined locations
2. inventory use, acquisition, loss and durability mutations
3. encounter state and simple encounter lifecycle
4. economy transactions using package-defined currencies
5. conditions/injuries and persistent recovery
6. richer package-defined checks without hardcoded world vocabulary
7. save/export/import hardening
8. narration bridge only after the runtime state model is stable enough to trust

Planning and architecture documents:

- `docs/plans/FABULA_NARRATIVE_DICE.md`
- `docs/plans/FABULA_PRE_ALPHA.md`
- `docs/WORLD_PACKAGES.md`
- `CHANGELOG.md`

Fabula-specific gameplay mechanics belong here rather than in Orbis.

Canonical branch: `main`.
