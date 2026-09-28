# Fabula Pre-Alpha

Status: active prototype

## Goal

Fabula Pre-Alpha proves one complete deterministic gameplay loop:

1. collect authoritative simulation state
2. construct a check from that state
3. resolve uncertainty from a recorded random seed
4. interpret the mechanical result
5. mutate persistent state
6. record an inspectable receipt
7. hand the immutable result to a future narrator bridge

The narrator may describe a resolved result. It may not alter the outcome or create canon to satisfy it.

## Prototype scope

The first prototype includes:

- a serializable runtime state
- world time
- actor health and fatigue
- decimal age derived from a birth-world timestamp
- inventory and item durability
- money
- a small narrative-dice resolver with independent success/failure and advantage/threat dimensions
- rare major positive and major negative result channels
- check construction from skill, equipment, weather and fatigue
- persistent consequence application
- event log
- deterministic receipts with the random seed recorded
- browser persistence via localStorage
- a dark simulation-console UI
- raw diagnostics for every resolution

The Bitterroot content in the prototype is demo state only. The runtime modules are intended to remain world-agnostic.

## UI identity

Fabula is the live world engine in the Howling Whispers ecosystem.

- Orbis: library and canon authoring
- Speculus: simulation/narration workstation
- Fabula: live mechanical world state and gameplay runtime
- Mouseion: proposal path for new canon

Fabula uses the shared dark slate/cyan visual family, but its identity is a live field-control and world-state console rather than a pure terminal.

## Authority boundary

The mechanical pipeline is authoritative:

`player action -> Fabula state -> check -> dice -> consequence -> state mutation -> receipt -> narrator`

A future Speculus bridge will receive the receipt after state mutation. NovelAI or another narrator can turn the result into prose, but cannot silently change success into failure, failure into success, restore consumed resources, invent unavailable equipment, create locations, or manufacture other canon facts.

## Pre-Alpha exit condition

Pre-Alpha is successful when a player action can be resolved end-to-end from real imported state and the resulting mutations are persisted and then narrated without the narrator being able to override them.

The current browser prototype is the local proof of that architecture. The next implementation step is replacing demo state with an Orbis/Fabula instance-state bridge.
