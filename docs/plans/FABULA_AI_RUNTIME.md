# Fabula AI Runtime Architecture

Status: pre-alpha architecture
Runtime architecture revision: 0.1

This document defines the AI/runtime boundary for Fabula.

The central rule is that Fabula simulates authoritative world state while the AI renders an experience of that state. The UI is deliberately not part of the runtime architecture. A future desktop, web, mobile, terminal, or redesigned GUI must be able to use the same runtime without changing simulation rules.

## 1. Core Principles

1. **Runtime before prose.** World state, action resolution, time, inventory, travel, encounters, and consequences are resolved by Fabula before narrative rendering.
2. **The AI is not world authority.** It may interpret or render approved state, but it may not directly invent or commit canonical state.
3. **Persona-limited viewpoint is enforced structurally.** The model should receive a perception projection rather than unrestricted world state whenever the viewpoint is persona-limited.
4. **Perception is permanent persona state.** Every user persona owns an embodiment/perception instance that survives scene changes and tracks what can physically reach that persona.
5. **Parallel simulation is private by default.** Events occurring elsewhere may continue to exist and progress, but they are not exposed to a persona unless their effects can physically reach that persona or another legitimate information path exists.
6. **Canon is authoritative.** Runtime resolution may use established canon but may not create new places, species, items, professions, geography, technologies, relationships, or other world facts merely to satisfy prose or a dice result.
7. **UI is replaceable.** Runtime APIs expose state, commands, events, diagnostics, and prose. The GUI is a client of those APIs.
8. **Inspectability matters.** Important decisions should have traceable inputs: world facts, perception facts, dice inputs/results, accepted state operations, rejected operations, and output-audit results.

## 2. Layered World Context

Fabula resolves context from broadest to narrowest:

```text
World / worldmap
    ↓
Active town / place sandbox
    ↓
Room / local environment
    ↓
Physical events and nearby entities
    ↓
Persona embodiment and five senses
    ↓
Perception snapshot
    ↓
Narrative context
```

### World / worldmap

Contains global lore, geography, factions, history, long-running simulation state, weather systems, travel connections, and other canonical reference material.

World-level information is not automatically narrative knowledge.

### Active town / place

The active sandbox contains the place currently relevant to the persona plus the local entities and systems needed for simulation.

Other locations may remain simulated in a lower-cost or background form, but their internal events are not automatically sent to the narrative model.

### Room / local environment

The local environment contains the immediate physical scene: nearby characters, structures, doors, walls, lighting, terrain, weather exposure, sound sources, smell sources, and other local conditions.

### Persona embodiment

The persona embodiment is the physical anchor of the user's viewpoint. It includes position, orientation, body state, sensory capability, injuries or impairments where applicable, equipment affecting perception, and temporary sensory conditions.

### Perception snapshot

The perception snapshot is the final first-hand knowledge allowed into persona-limited prose.

## 3. Runtime Modules

Fabula should keep the following modules independent.

### 3.1 Canon Adapter

Reads canonical world data from the current backing system. Orbis may later be the primary adapter, but the runtime interface must not hard-code Orbis into the simulation core.

Responsibilities:

- read canonical entities and relationships
- resolve stable IDs
- provide immutable/reference facts
- reject nonexistent canon references
- expose permissions and ownership where relevant

### 3.2 Simulation State Store

Owns mutable runtime state that matters during play.

Examples:

- current world time
- current persona position
- active place and room
- inventory and equipped items
- money and economy state
- injuries, fatigue, hunger, thirst, temperature exposure
- encounters
- travel progress
- mount/cart state
- relationship and reputation state when mutable
- jobs and commitments
- temporary environmental state

### 3.3 Scope Loader

Builds the smallest world slice necessary to resolve the current turn.

Suggested loading order:

```text
world references needed by current scope
+ active place
+ local room/environment
+ nearby entities
+ current persona
+ active encounter/travel/task state
```

This is the token-saving boundary. The runtime should not send an entire world to the model just because it exists.

### 3.4 Action Interpreter

Converts player input into one or more candidate actions without committing them.

Example internal form:

```json
{
  "intent": "open",
  "targetId": "door-17",
  "method": "hand",
  "spokenText": null
}
```

The interpreter may be deterministic for commands and use an AI parser for natural-language input, but parsed intent remains untrusted until validation.

### 3.5 Action Validator

Checks whether the requested action is physically and canonically possible from current state.

Checks can include:

- target exists
- target is reachable or perceptible where required
- item is actually carried/equipped
- required ability exists
- movement route exists
- permissions allow the action
- current body state permits the action
- action does not rely on hidden knowledge the persona does not possess

### 3.6 Resolution Engine

Resolves uncertain actions using the Fabula narrative dice/resolution system.

The resolution engine consumes authoritative state. The AI does not choose a preferred result and then alter the dice to reach it.

Resolution produces a mechanical result and candidate consequences.

### 3.7 State Transaction Engine

Applies validated persistent changes as an atomic transaction.

Examples:

- elapsed time
- changed position
- fatigue
- injury
- inventory changes
- item condition
- money
- relationship/reputation deltas
- encounter state
- travel progress

If a transaction fails validation, none of its partial state changes should become authoritative.

### 3.8 Perception Engine

Projects authoritative local reality into the persona's experienced reality.

It tracks five physical senses:

- vision
- hearing
- smell
- touch
- taste

It may also attach recognition and confidence information without creating knowledge that the persona could not possess.

### 3.9 Narrative Context Builder

Builds the model prompt from approved information only.

For persona-limited narration, the normal narrative model should receive:

- persona identity and relevant stable traits
- current body state that the persona can know/feel
- perception snapshot
- relevant remembered/known facts
- resolved action result
- approved state consequences
- allowed dialogue/personality context for currently relevant NPCs
- narrative style instructions

It should not receive unrestricted hidden world state unless a specific narrator mode explicitly requires it.

### 3.10 AI Provider Adapter

Abstracts NovelAI or another provider from the rest of Fabula.

Suggested interface:

```text
generateNarrative(request) -> candidate narrative
interpretAction(input, limited context) -> candidate structured intent
```

Provider-specific parameters stay in the provider adapter rather than leaking through the simulation core.

### 3.11 Output Auditor

Acts as the final viewpoint/canon check before prose is released.

It checks for:

- references to entities not present in allowed context
- hidden locations or off-screen events stated as known facts
- unexplained speaker identification
- internal NPC thoughts presented as persona knowledge
- invented inventory/items/abilities
- outcomes contradicting resolved mechanics
- state changes narrated but not committed
- forbidden omniscient causal explanations

If the output fails, the preferred response is a constrained rerender using the same resolved state, not a reroll.

### 3.12 Event Bus / Runtime Output

Publishes UI-neutral runtime events.

Examples:

```text
turn.started
input.interpreted
action.validated
roll.required
roll.resolved
state.committed
perception.updated
narrative.generated
narrative.rejected
narrative.accepted
turn.completed
```

The future GUI may subscribe to these events to show dice, diagnostics, animation, prose, status panels, or nothing at all.

## 4. Permanent Persona Perception Instance

Each user persona owns a persistent perception/embodiment record.

Suggested conceptual schema:

```json
{
  "personaId": "persona-123",
  "embodiment": {
    "worldId": "world-1",
    "placeId": "place-4",
    "roomId": "room-9",
    "position": { "x": 0, "y": 0, "z": 0 },
    "facing": { "yaw": 0, "pitch": 0 },
    "posture": "standing"
  },
  "senses": {
    "vision": { "enabled": true },
    "hearing": { "enabled": true },
    "smell": { "enabled": true },
    "touch": { "enabled": true },
    "taste": { "enabled": true }
  },
  "conditions": [],
  "knownEntityIds": [],
  "recognitionProfiles": []
}
```

Exact spatial representation can change later. The important requirement is that this record belongs to the runtime rather than to the GUI or prose model.

## 5. Sensory Projection Rules

### 5.1 Vision

Vision should consider, when data exists:

- line of sight
- distance
- facing / field of view
- lighting
- obstruction
- weather/particles/fog
- size and visibility of target
- persona vision condition

A visible entity can be identified only if recognition conditions support identification.

### 5.2 Hearing

Hearing should consider:

- source volume
- distance
- walls/doors/terrain
- ambient noise
- directionality where supported
- persona hearing condition

Speech is special: intelligible speech should normally remain direct speech in prose.

If the speaker is not visually known, the runtime must not automatically identify the speaker merely because world state contains the source ID.

Possible outcomes:

```text
"Get away from there!"
```

or:

```text
A muffled voice calls from somewhere beyond the wall. "Get away from there!"
```

If the persona has a valid voice-recognition basis, the perception snapshot may expose something like:

```json
{
  "sourceId": "npc-fen",
  "recognizedAs": "Fen",
  "confidence": 0.94,
  "basis": "voice-recognition"
}
```

### 5.3 Smell

Smell should propagate from actual local sources and can be reduced by distance, barriers, airflow, weather, or competing odors.

The runtime should distinguish smelling smoke from knowing exactly which unseen object is burning.

### 5.4 Touch

Touch includes direct bodily contact and physically experienced effects such as:

- held objects
- impacts
- pressure
- temperature against the body
- rain/wind exposure
- ground texture underfoot
- pain and bodily sensation

### 5.5 Taste

Taste normally requires material contact with the mouth and should not be inferred from object identity alone.

## 6. Knowledge, Recognition, and Perception Are Different

Fabula should not collapse these into one flag.

Example:

- World reality: Fen is behind a closed door.
- Perception: a familiar voice is audible through the door.
- Recognition: persona identifies the voice as probably Fen.
- Knowledge: persona previously knows Fen and knows his voice.

Narrative permission can therefore say "Fen's voice" without granting visual knowledge that Fen is physically behind the door in a specific posture.

## 7. Parallel Instances and Multiplayer Privacy

A shared world can contain many simultaneous simulation branches or active personas.

The authoritative world may process events for all of them, but each persona gets a separate perception projection.

```text
Shared authoritative world tick
    ├─ Persona A perception snapshot
    ├─ Persona B perception snapshot
    └─ Background/off-screen state
```

Private roleplay content must not cross into another persona's narrative merely because both occupy the same world database.

Information can cross only through legitimate world mechanisms, for example:

- direct visual/auditory presence
- a character later telling another character
- an object/message physically transferred
- a public event with effects that propagate into range
- another canon-supported communication system

The runtime should treat private transcripts as separate from shared world facts.

## 8. Turn Pipeline

A normal player turn should follow this order:

```text
1. Receive player input
2. Load authoritative persona + scoped world state
3. Interpret candidate action(s)
4. Validate candidate action(s)
5. Determine whether mechanical resolution is required
6. Resolve dice/mechanics if required
7. Build candidate persistent state transaction
8. Validate and commit state transaction
9. Advance world time / process due local simulation
10. Compute persona perception snapshot
11. Build AI narrative context from permitted facts only
12. Generate candidate prose
13. Audit candidate prose against perception, canon, and mechanics
14. Rerender if audit fails (do not reroll)
15. Accept prose
16. Record turn diagnostics/event log
17. Publish UI-neutral runtime events/results
```

This ordering prevents generated prose from becoming the source of truth.

## 9. Why Perception Is Computed After Mechanical Resolution

The player action can change what is perceivable.

Examples:

- opening a door exposes a new line of sight
- walking closer makes speech intelligible
- lighting a lamp changes visibility
- receiving an injury changes vision/hearing/body sensation
- entering a room exposes new smells or characters

Therefore the final perception snapshot used for prose should describe the world **after** the approved action result has been committed for that turn.

For actions where the player must choose based on current perception, the runtime may also retain a pre-action perception snapshot for validation/debugging.

## 10. Narrative Output Contract

The narrative generator should ideally return structured metadata alongside prose.

Conceptually:

```json
{
  "prose": "...",
  "referencedEntityIds": ["npc-1", "item-4"],
  "assertedFacts": [
    { "kind": "visible", "entityId": "npc-1" },
    { "kind": "speech", "sourceId": "npc-1" }
  ]
}
```

The prose remains the player-facing output. Metadata helps the auditor detect leakage and hallucinated references.

Provider adapters that cannot reliably produce metadata can still be supported, but structured output is preferred when available.

## 11. Output Audit Strategy

The strongest defense against viewpoint leakage is **not giving hidden facts to the narrative model in the first place**.

The final audit is defense in depth.

Audit levels:

### Level A: deterministic checks

- named entity is in allowed context
- mentioned item is canonical and locally available where required
- referenced state consequence matches committed transaction
- speaker attribution has recognition/visibility basis

### Level B: claim grounding

Compare model-declared assertions with allowed perception/knowledge facts.

### Level C: constrained AI audit

If necessary, use a separate low-creativity check that receives candidate prose plus the allowed fact set and identifies unsupported claims.

The auditor must never add new world facts while repairing text.

## 12. Memory Model

Fabula should eventually distinguish at least:

- **world fact**: true in authoritative simulation/canon
- **persona knowledge**: learned and retained by this persona
- **current perception**: physically experienced now
- **transcript**: what was narrated/said in past turns

A transcript alone should not be treated as authority if it conflicts with canonical state.

Persona memory should store knowledge gained through legitimate perception or communication, not every hidden fact used internally by the simulator.

## 13. NPC AI Boundary

NPC decision-making and player-facing prose should be separable.

An NPC may have private goals, memories, relationships, and knowledge used by the NPC decision system. Those private internals must not automatically be included in the persona-facing narrative context.

Example:

Runtime may know:

```text
Ragna is worried about tomorrow's patrol.
```

Persona perception may know only:

```text
Ragna's ears flatten and she pauses before answering.
```

The prose may describe the observable behavior. It may not state the hidden emotion or reason as fact unless the persona legitimately knows it.

## 14. UI/GUI Boundary

The runtime must not depend on screen layout, panels, CSS, widgets, modal structure, or current pre-alpha visual design.

A client-facing turn result can be conceptually simple:

```json
{
  "turnId": "turn-123",
  "prose": "...",
  "worldTime": "...",
  "publicStateDelta": {},
  "rollSummary": null,
  "diagnosticsRef": "diag-123"
}
```

Diagnostics can be requested separately.

This lets a future GUI choose whether to show:

- only prose
- prose + dice
- a debug perception inspector
- inventory panels
- maps
- timeline information
- developer diagnostics

without changing runtime behavior.

## 15. Diagnostics

Developer diagnostics should make runtime decisions inspectable.

Suggested sections:

```text
TURN
INPUT
INTERPRETED ACTION
SCOPE
MECHANICAL RESOLUTION
STATE TRANSACTION
PERCEPTION
RECOGNITION
ALLOWED NARRATIVE FACTS
REJECTED / HIDDEN FACTS
AI PROVIDER META
OUTPUT AUDIT
```

A useful perception inspector may show:

```text
VISION
✓ Ragna Holt — visible — unobstructed
✗ Fen — blocked by wall

HEARING
✓ Ragna speech — clear
✓ Unknown impact — distant / muffled
✓ Familiar voice — probable Fen — 0.94 confidence

SMELL
✓ Wood smoke — strong

TOUCH
✓ Cold mug in hand
✓ Fireplace warmth — weak

TASTE
✓ Bitter ale

REJECTED KNOWLEDGE
✗ Fen entered the rear corridor
  reason: outside visual field and not otherwise learned

✗ Ragna is worried about tomorrow
  reason: private NPC state
```

## 16. Failure and Retry Rules

### AI generation failure

Retry/reroute generation without changing already-resolved mechanics.

### Output audit failure

Rerender from the same perception snapshot and committed state.

### Provider failure before mechanics

No state should be committed if the provider was required to interpret the action and interpretation did not complete.

### State transaction failure

Do not generate prose that claims the failed transaction happened.

### Dice/UI failure

A UI display failure must never cause a reroll. The recorded mechanical result remains authoritative.

## 17. Determinism and Replay

Each turn should eventually be reproducible enough for debugging.

Record at minimum:

- stable turn ID
- input
- state revision(s)
- scope IDs
- action interpretation
- roll seed/result or equivalent recorded random result
- committed transaction
- perception snapshot hash/revision
- provider/model configuration metadata as allowed
- accepted narrative output
- audit result

A rerender may create a new prose revision while preserving the same turn mechanics.

## 18. Security and Trust Boundaries

Treat these as untrusted:

- natural-language player requests
- AI-interpreted actions
- AI-proposed state operations
- AI narrative assertions

Treat these as authoritative only after runtime validation:

- canon adapter results
- committed simulation state
- mechanical resolution results
- accepted state transactions
- derived perception snapshot

## 19. Relationship to Existing Narrative Dice Plan

The existing narrative-dice plan already separates:

1. simulation state collection
2. check construction
3. random resolution
4. mechanical interpretation
5. persistent state update
6. narrative rendering

This runtime architecture preserves that separation and adds the missing viewpoint stages:

```text
persistent state update
    ↓
perception projection
    ↓
narrative rendering
    ↓
output audit
```

Dice and perception therefore use the same authoritative world state rather than becoming competing systems.

## 20. Initial Pre-Alpha Implementation Order

Recommended runtime build order:

1. Runtime turn IDs and event log
2. Persona embodiment record
3. Scoped world/local-state loader
4. Basic deterministic perception engine
   - room membership
   - simple line-of-sight/visibility flags
   - hearing range + barriers
   - touch from direct contact
   - smell/taste source lists
5. Action interpretation contract
6. Action validation contract
7. Dice/resolution integration
8. Atomic state transaction layer
9. Perception snapshot builder
10. Narrative context builder
11. Provider adapter
12. Output auditor
13. Diagnostics endpoint/event
14. Multiplayer/private perception projections
15. More advanced spatial propagation and recognition confidence

The first pre-alpha does not need a perfect physics engine. It needs stable boundaries so better spatial, sensory, and AI logic can replace simple implementations later without rewriting the rest of Fabula.

## 21. Changelog

### Runtime architecture revision 0.1

- Defined Fabula as authoritative simulation and AI as narrative renderer.
- Added permanent persona embodiment/perception instance.
- Added five-sense perception projection.
- Added speaker visibility/recognition rules.
- Added world → place → room → senses → viewpoint context layering.
- Added parallel-instance and multiplayer privacy boundary.
- Added full turn pipeline from input through state commit, perception, generation, audit, and UI-neutral events.
- Added final output audit without rerolling resolved mechanics.
- Added explicit headless runtime / replaceable GUI boundary.
- Integrated perception stages with the existing narrative dice architecture.
