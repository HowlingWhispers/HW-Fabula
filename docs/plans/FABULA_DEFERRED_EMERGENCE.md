# Fabula Deferred Emergence and Off-Screen Simulation

Status: pre-alpha architecture
Revision: 0.1

This document defines how Fabula should handle places, rooms, characters, and events that are outside the currently active persona scope.

The goal is to avoid both extremes:

- fully simulating every room, NPC, and action at maximum detail all the time
- freezing unloaded places until the player returns

Fabula should instead preserve causal state, simulate only the level of detail that matters, and resolve hidden development when a place or character becomes relevant again.

## 1. Core Rule

A location outside the active local scope is not fully rendered or continuously simulated at prose-level detail.

Instead, Fabula stores a snapshot plus enough causal state to later determine what plausibly happened while the location was inactive.

When the location becomes relevant again, Fabula performs a catch-up pass and extracts the present consequences that matter now.

The player should normally experience the resulting present state, not an omniscient replay of everything that happened off-screen.

## 2. Simulation Scope Levels

Fabula should distinguish at least four scope levels.

### 2.1 Active local scope

The persona's immediate room, road segment, marketplace chunk, house interior, forest clearing, or equivalent local environment.

This receives the highest simulation detail because it can directly affect the persona's five senses and current actions.

Typical contents:

- exact nearby characters
- local positions
- current activities
- dialogue/action resolution
- line of sight
- sound propagation
- direct environmental effects
- inventory interaction
- combat or other encounters

### 2.2 Active place scope

The surrounding town, settlement, district, wilderness place, or other parent sandbox.

This scope maintains enough state to know where characters may move and what local systems are doing without fully narrating every unseen action.

Typical contents:

- schedules and current destinations
- coarse positions
- jobs and responsibilities
- active local events
- weather and economy changes
- travel between local sublocations
- known social commitments
- pending encounters or consequences

### 2.3 Dormant local scope

A room or local environment that has been left behind.

It becomes a snapshot rather than remaining a continuously detailed scene.

The snapshot becomes the foundation for later development.

### 2.4 Remote world scope

Places far outside the current active sandbox.

These should normally use only coarse simulation, scheduled events, world clocks, and state transitions that can have meaningful future effects.

They should not consume narrative-model context simply because they exist.

## 3. Location Snapshot

When a local scope unloads, Fabula should store a causal snapshot.

Conceptually:

```json
{
  "scopeId": "room-17",
  "snapshotAt": "world-time",
  "revision": 42,
  "environment": {
    "state": {},
    "persistentChanges": []
  },
  "actors": [
    {
      "characterId": "npc-8",
      "position": {},
      "activity": "closing-shop",
      "intentions": [],
      "conditions": [],
      "commitments": [],
      "knowledgeRevision": 12
    }
  ],
  "pendingProcesses": [],
  "unresolvedConsequences": [],
  "externallyAnchoredFacts": []
}
```

The exact schema can change. The important point is that the snapshot captures the state required to continue causally later.

## 4. Deferred Emergence

When time passes while a scope is unloaded, Fabula does not need to invent a complete hidden transcript.

Instead, on reactivation it determines what developments are required or plausible from:

- elapsed world time
- character sheets
- character goals, habits, obligations, relationships, and capabilities
- physical conditions and injuries
- town/place conditions
- jobs and schedules
- weather
- economy and resources
- known commitments
- movement possibilities
- unresolved earlier events
- encounters with other simulated actors
- events that became externally anchored elsewhere
- controlled randomness where appropriate

Fabula then materializes only the hidden developments needed to produce a coherent current state.

This is **deferred emergence**.

## 5. Catch-Up Pass on Re-entry

When the persona enters or otherwise makes a dormant scope relevant again:

```text
1. Load previous snapshot
2. Measure elapsed world time
3. Load relevant current parent-place/world state
4. Resolve scheduled and unavoidable processes
5. Resolve plausible actor movements and activities
6. Resolve interactions that materially affect current state
7. Apply persistent consequences
8. Update NPC knowledge/belief state
9. Produce the new authoritative local state
10. Compute the persona's perception of that state
11. Narrate only what the persona can now perceive or legitimately know
```

The catch-up pass may discover surprising but canon-consistent developments. Surprise is allowed; arbitrary invention is not.

## 6. Causal Anchors Prevent Retroactive Contradictions

Deferred simulation must never rewrite facts already made authoritative.

Examples of anchors:

- something the persona directly witnessed
- an item already removed from inventory
- a committed injury
- a message already delivered
- a character whose location was independently established elsewhere
- an event witnessed by another active persona
- a world-state transaction already committed

Once an outcome becomes externally anchored, later deferred emergence must work around it rather than contradict it.

## 7. NPC Private Experience

NPCs may have experiences while outside the persona's perception.

These experiences can affect their later:

- mood and behavior
- goals
- relationships
- injuries or condition
- inventory
- schedule
- knowledge
- beliefs
- willingness to disclose information

Those experiences do not automatically become player knowledge.

Fabula should store the consequence and any information the NPC learned without automatically generating player-facing prose about the hidden event.

## 8. NPC Knowledge Is Not World Truth

Each significant character should eventually have an epistemic state distinct from authoritative world state.

An NPC can:

- observe something correctly
- misidentify someone
- overhear only part of a conversation
- infer a motive incorrectly
- believe a rumor
- forget details
- lie
- deliberately conceal information
- hold contradictory or uncertain beliefs

Conceptually:

```json
{
  "characterId": "npc-8",
  "beliefs": [
    {
      "claim": "persona-entered-storehouse",
      "confidence": 0.78,
      "source": "partial-visual-observation",
      "truthStatus": "unknown-to-character"
    }
  ]
}
```

The authoritative simulation may know whether the claim is true. The NPC does not gain that privileged truth automatically.

## 9. One-Way Observation

Perception is directional.

A character may see or hear the persona without being perceived by the persona.

Example:

```text
NPC has line of sight to Persona
Persona does not have line of sight to NPC
```

In that case:

- the NPC may gain an observation or belief
- the NPC may later change behavior because of it
- the NPC may tell another character
- the NPC may draw the wrong conclusion
- the persona receives no immediate narrative knowledge unless a sensory effect reaches them

This prevents the player viewpoint from becoming omniscient simply because the simulator knows an observer exists.

## 10. Information Propagation

Information should move through the world as an event, not as automatic shared knowledge.

Possible paths include:

- direct conversation
- overheard speech
- visual observation
- written messages
- physical evidence
- public announcements
- rumors passed from one character to another
- canon-supported communication systems

Every hop may alter certainty, completeness, interpretation, or truthfulness.

This allows social consequences to emerge without giving every NPC a shared hive mind.

## 11. Characters Need Not Explain Themselves

When the persona returns, Fabula should not force NPCs to summarize what happened while the persona was away.

A character may:

- say nothing
- mention only part of what happened
- hide it
- lie about it
- tell someone else instead
- behave differently without explaining why
- reveal it much later

What becomes noticeable should depend on actual consequences and the returning persona's perception.

For example, the persona may notice:

- a boarded window
- an absent worker
- an NPC limping
- changed tension between two characters
- missing stock
- a new smell of smoke
- someone avoiding eye contact

But Fabula should not automatically narrate the hidden cause unless the persona has a legitimate basis to know it.

## 12. Emergence Budget

The amount of hidden development may scale with:

- elapsed time
- number of unresolved processes
- actor autonomy
- instability of the location
- active conflicts
- scheduled events
- relationships and commitments
- available resources
- probability of meaningful encounters

A room left for five minutes may change very little.

A town left for several months may undergo much larger development.

This should be bounded by canon and causal constraints rather than by a desire to create drama.

## 13. Detail Should Be Materialized Lazily

Fabula should avoid deciding unnecessary hidden details prematurely.

If an NPC was away for three days and only the present injury matters, the runtime may only need to establish enough hidden causal history to support that injury.

If later play requires details of what occurred, Fabula may materialize additional history as long as it does not contradict established anchors.

This reduces token usage and prevents needless background lore generation.

## 14. Relationship to Persona Perception

Deferred emergence determines authoritative present state.

The permanent persona perception instance still performs the final viewpoint filter.

```text
Dormant snapshot
    ↓
Deferred catch-up / emergence
    ↓
Authoritative current local state
    ↓
Persona five-sense projection
    ↓
Persona knowledge + recognition
    ↓
Narrative context
    ↓
Output audit
```

Therefore hidden catch-up results do not leak into prose simply because they were computed.

## 15. Relationship to Multiplayer

Different personas may activate different scopes simultaneously.

If another player witnesses an event, that event becomes authoritative for the shared world but remains private from personas who did not perceive or learn it.

If two active scopes interact causally, the runtime must reconcile them through shared committed state rather than generating incompatible local histories.

Private roleplay transcript text remains separate from shared state unless an action or consequence is explicitly committed to the world.

## 16. Relationship to Dice and Uncertain Events

Deferred simulation may use mechanical resolution for materially uncertain hidden events, but it should not roll constantly for trivial background activity.

A hidden roll should be recorded if its result later becomes an authoritative consequence.

The same rules apply as foreground rolls:

- use actual state
- do not manipulate results for story preference
- do not invent canon to satisfy symbols
- store persistent consequences
- do not expose the roll to the persona unless appropriate

## 17. Suggested Runtime Components

This model suggests several headless runtime services:

```text
ScopeManager
SnapshotStore
WorldClock
DeferredSimulationEngine
ScheduleResolver
MovementResolver
NPCDecisionEngine
KnowledgeAndBeliefStore
InformationPropagationEngine
StateTransactionEngine
PerceptionEngine
NarrativeContextBuilder
OutputAuditor
```

None of these should depend on the GUI.

The GUI may display some of their diagnostics, but it does not own their rules.

## 18. Diagnostics

Developer diagnostics should make off-screen development inspectable without exposing it to normal player prose.

Possible sections:

```text
SCOPE STATUS
last active time
snapshot revision
elapsed time

CATCH-UP
scheduled processes resolved
actors moved
interactions resolved
state changes committed

KNOWLEDGE
NPC observations gained
beliefs changed
information transferred

ANCHORS
facts that constrained emergence

PERSONA VISIBILITY
which resulting facts reached the persona
which remained hidden
```

## 19. Pre-Alpha Simplification

The first implementation does not need sophisticated agent simulation.

A useful first version can use:

- snapshot timestamps
- deterministic schedules
- simple goal priorities
- coarse actor locations
- a small set of deferred event rules
- seeded random resolution for uncertain material events
- basic per-NPC knowledge records
- reactivation catch-up

The architecture should allow these simple resolvers to be replaced later without changing the GUI or the main turn contract.

## 20. Changelog

### Revision 0.1

- Defined active, dormant, and remote simulation scopes.
- Added snapshots for unloaded local environments.
- Added deferred emergence and re-entry catch-up.
- Added causal anchors to prevent retroactive contradiction.
- Separated NPC beliefs from authoritative world truth.
- Added one-way observation where an NPC may perceive the persona without reciprocal perception.
- Added information propagation rather than automatic shared NPC knowledge.
- Added lazy materialization of hidden history.
- Integrated deferred simulation with persona perception, multiplayer privacy, narrative dice, and the headless/UI-independent runtime.
