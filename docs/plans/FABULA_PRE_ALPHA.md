# Fabula Pre-Alpha

Status: active prototype

## Goal

Fabula Pre-Alpha proves one complete roleplay-first gameplay loop:

1. accept the player's freeform roleplay turn
2. preserve that authored turn verbatim
3. inspect authoritative simulation state
4. decide whether any part of the turn genuinely requires mechanics
5. construct and resolve only the necessary check(s)
6. mutate persistent state from the mechanical result
7. record inspectable receipts
8. hand the player turn, relevant state and immutable receipts to the narrator
9. append the narrated world response and continue roleplay

The narrator may describe a resolved result. It may not alter the outcome or create canon to satisfy it.

## Prototype scope

The first prototype includes:

- a dominant roleplay transcript and freeform text composer
- a serializable runtime state
- world time
- actor health and fatigue
- decimal age derived from a birth-world timestamp
- inventory and item durability
- money
- a conservative pre-alpha intent adapter for a few demo actions
- a small narrative-dice resolver with independent success/failure and advantage/threat dimensions
- rare major positive and major negative result channels
- check construction from skill, equipment, weather and fatigue
- persistent consequence application
- event log
- deterministic receipts with the random seed recorded
- browser persistence via localStorage
- secondary state, inventory and diagnostics views
- a structured narration payload that preserves the player turn and mechanical authority boundary

The Bitterroot content in the prototype is demo state only. The runtime modules are intended to remain world-agnostic.

## Product identity

Fabula is the playable persistent runtime in the Howling Whispers ecosystem.

- Orbis: library, canon and authored world data
- Speculus: simulation/narration workstation and provider-facing scene machinery
- Fabula: the place where the player actually lives and roleplays in a persistent world
- Mouseion: proposal path for genuinely new canon

The simulation is underneath the roleplay. A player should not need to operate a GM dashboard, choose a mechanical action from a menu, or manually press a Resolve button for ordinary play.

The primary Fabula screen is therefore the scene itself: world narration, NPC dialogue, player turns and a composer. Mechanical state remains available, but secondary.

## Authority boundary

The authoritative pipeline is:

`player roleplay -> intent/uncertainty detection -> Fabula state -> optional check -> consequence -> persistent mutation -> receipt -> narrator -> next roleplay turn`

A future Speculus bridge receives the player turn and any receipts after state mutation. NovelAI or another narrator can turn the result into prose, but cannot silently change success into failure, failure into success, restore consumed resources, invent unavailable equipment, create locations, or manufacture other canon facts.

Dialogue, observation and ordinary actions should not be forced through dice merely to create drama. Established facts remain facts.

## Pre-Alpha exit condition

Pre-Alpha is successful when a player can write naturally to a real imported world, Fabula can determine what (if anything) requires mechanical resolution, resulting mutations persist, and the world can answer through the narration layer without the narrator being able to override mechanics or canon.

The current browser prototype is the local proof of the roleplay/state boundary. The next implementation step is replacing demo state with an Orbis/Fabula instance-state bridge and connecting the structured narration request to Speculus/provider output.
