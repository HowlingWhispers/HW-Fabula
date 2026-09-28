# HW-Fabula

Fabula is the Howling Whispers gameplay and world-simulation runtime.

**Current status: Pre-Alpha prototype.**

The repository now contains a zero-dependency browser prototype that demonstrates the first authoritative gameplay loop: state -> check construction -> deterministic narrative dice -> persistent consequences -> inspectable receipt.

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

- dark live-world console UI
- Bitterroot-flavored demo state
- persistent browser state
- world clock
- health, fatigue, money and inventory
- decimal age from a birth-world timestamp
- deterministic recorded dice seeds
- independent success/failure and advantage/threat dimensions
- major positive/negative result channels
- mechanical state mutations and event log
- raw resolution diagnostics
- narrator authority boundary: describe, never override mechanics or create canon

The runtime is intentionally small. The next major step is replacing demo state with authoritative Fabula instance state imported from Orbis and then exposing immutable mechanical results to Speculus for narration.

Planning documents:

- `docs/plans/FABULA_NARRATIVE_DICE.md`
- `docs/plans/FABULA_PRE_ALPHA.md`

Fabula-specific mechanics belong here rather than being stored in Orbis simply because Orbis is currently the more developed application.

Canonical branch: `main`.
