# HW-Fabula

Fabula is the Howling Whispers gameplay and persistent world-simulation runtime.

**Current status: Pre-Alpha prototype.**

Fabula is roleplay-first. The player writes naturally to the world. Fabula preserves that turn, checks authoritative world and character state, resolves only actions that genuinely need mechanics, persists the result, and prepares an immutable narration payload for the story layer.

The simulation is underneath the roleplay, not the main user interface.

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

## Current prototype

- dominant roleplay transcript and freeform composer
- Enter sends / Shift+Enter inserts a new line
- Bitterroot-flavored demo scene and persistent browser state
- conservative pre-alpha intent adapter for a few demonstration actions
- world clock, health, fatigue, money and inventory
- decimal age from a birth-world timestamp
- deterministic recorded dice seeds
- independent success/failure and advantage/threat dimensions
- major positive/negative result channels
- mechanical state mutations and event log
- state, inventory and diagnostics kept secondary to the roleplay
- structured narration payload carrying the player turn, world state and mechanical receipts
- narrator authority boundary: describe results, never override mechanics or create canon

The local narration shown for resolved demo actions is only a mechanical preview. The real prose response belongs to the future Speculus/provider narration bridge.

## Runtime direction

The intended loop is:

```text
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
Speculus / provider narration
    ↓
next roleplay turn
```

The next major step is replacing the demo state with authoritative Fabula instance state sourced from Orbis, then connecting the narration payload to Speculus without allowing generated prose to rewrite the mechanical result.

Planning documents:

- `docs/plans/FABULA_NARRATIVE_DICE.md`
- `docs/plans/FABULA_PRE_ALPHA.md`

Fabula-specific gameplay mechanics belong here rather than in Orbis.

Canonical branch: `main`.
