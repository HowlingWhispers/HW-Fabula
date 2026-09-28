# Fabula World Packages

Status: Pre-Alpha contract

Fabula core must not contain world-specific canon, names, currencies, skills, action vocabulary, starting scenes or special-case rules. Those belong to a world package supplied to the runtime.

Bitterroot is currently the first local demo package under `worlds/bitterroot-demo/`. It is a test cartridge, not part of Fabula core.

## Boundary

The runtime receives two independent inputs:

1. a **world package** describing authored rules and starting data
2. a **runtime instance state** describing what is currently true in one playthrough

Conceptually:

```text
world package + saved instance -> Fabula runtime -> updated saved instance
```

Fabula does not need to know whether the package represents fantasy, science fiction, horror, a modern setting, or something else.

## Current package shape

A Pre-Alpha package can provide:

```js
{
  schemaVersion,
  id,
  name,

  economy: {
    currencies: []
  },

  rules: {
    skills: [],
    resourceLimits: {},
    globalModifiers: [],
    consequenceDefaults: {},
    intents: [],
    actions: {}
  },

  initialState: {
    clock,
    location,
    weather,
    actor,
    encounter,
    scene
  }
}
```

This shape is deliberately small and will evolve. The point of the contract is the direction of authority: world data is supplied to Fabula rather than baked into Fabula.

## Runtime state

`createStateFromWorldPackage(worldPackage)` creates a serializable instance with:

- package identity
- instance identity
- world clock
- current location
- current weather/environment snapshot
- actor state
- balances
- skills
- inventory and durability
- temporary mechanical effects
- encounter state
- scene transcript
- last mechanical receipt
- event log

Runtime mutations are stored in the instance. They do not mutate the authored world package.

## Actions and checks

Actions are declared by the package. Fabula core understands generic fields such as:

- action ID
- label
- skill ID
- difficulty
- modifiers
- consequence configuration
- optional local preview text

The current generic modifier evaluators include:

- inventory item with a tag
- weather label containing a value
- visibility equal to a value
- actor numeric stat at or above a threshold

Adding a new world should not require adding `if (world === ...)` branches to Fabula core.

## Intent mapping

The Pre-Alpha local roleplay adapter uses conservative package-declared regular-expression patterns to map obvious prose to action IDs. This is temporary scaffolding.

Later Speculus/provider interpretation may emit structured intents, but it must emit the same world-defined action IDs and remains subordinate to Fabula's authoritative state and mechanics.

The narrator does not gain permission to create canon or alter a resolved outcome merely because it interprets prose.

## Economy

Currencies are package data. Fabula stores balances by currency ID:

```js
actor.balances[currencyId]
```

Fabula core does not assume that a world uses `coin`, credits, dollars, silver, or any currency at all.

## Local saves

Pre-Alpha saves are browser-local and keyed by world ID plus slot ID. This prevents two world packages from sharing the same save namespace.

The UI currently provides six manual save slots plus a hidden autosave used for crash/refresh continuity.

This is temporary local persistence. Server persistence and Orbis integration come later.

## Test requirement

Fabula's test suite includes a synthetic non-Bitterroot `Orbital Test` package. It intentionally uses unrelated names, a `credits` currency, a `systems` skill and an `override_console` action.

That test exists to catch accidental world coupling in core code.

## Future package sources

A package may eventually come from:

- a local development module
- an imported standalone world bundle
- Orbis
- a server-side Fabula instance bootstrap

Those sources should converge on the same validated package contract before entering the runtime.
