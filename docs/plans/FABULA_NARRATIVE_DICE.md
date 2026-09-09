# Fabula Narrative Dice and Resolution System

Status: planning / future system

This document defines the planned direction for uncertain-action resolution in Fabula.

The system should use a Genesys-style narrative dice philosophy rather than a simple binary pass/fail roll. The exact dice names, symbols, probabilities and presentation are not locked yet. The goal is to preserve the useful mechanic: one roll can answer both whether an action succeeds and what additional consequences, opportunities or complications occur.

## Core Principle

A roll should be able to produce multiple independent result dimensions.

Examples:

- success with advantage
- success with threat
- failure with advantage
- failure with threat
- a rare major positive result comparable to a triumph
- a rare major negative result comparable to a despair
- combinations where a major result occurs even when the basic action succeeds or fails

This lets Fabula resolve uncertain situations as part of the living world instead of treating every check as only `success` or `failure`.

## When Fabula Should Roll

Dice are for genuinely uncertain actions and encounters.

Fabula should not roll merely to create drama. If established facts make the outcome obvious, the simulation should follow those facts.

Possible roll situations include:

- combat and physical confrontations
- sneaking, tracking and hunting
- climbing, swimming and difficult travel
- persuasion, deception or intimidation when the outcome is genuinely uncertain
- escaping danger
- treating injuries
- handling a frightened or exhausted mount
- navigating severe weather or hazardous terrain
- repairing or using equipment under difficult conditions
- other canon-supported tasks where skill and circumstance matter

## Building the Check

The dice pool or equivalent resolution state must be built from actual simulation data.

Relevant factors can include:

- the player's canonical skills and abilities
- the player's physical condition and injuries
- fatigue, hunger, thirst or other tracked states
- carried and equipped items
- item quality, condition and suitability
- encumbrance
- terrain and slope
- weather
- visibility and lighting
- surprise and preparation
- position and distance
- opponent strength, skill, equipment and condition
- allies and opponents that are actually present
- mount condition and capability
- cart or wagon condition and load
- environmental hazards
- established social reputation or relationships
- any other relevant fact already present in canon or the current simulation state

The runtime AI must not quietly improve or weaken a character because it wants a particular story result.

## Narrative Result Dimensions

### Success and Failure

This answers the primary question of the attempted action.

Examples:

- Did the character cross the river?
- Did the attack connect?
- Did the character identify the trail?
- Did the repair work?

The amount of net success may later be used for degrees of success where appropriate.

### Advantage and Threat

This answers what else happens around the primary result.

Advantage can produce a useful secondary effect even when the primary action fails.

Threat can create a complication or cost even when the primary action succeeds.

Possible advantage outcomes include:

- improved position
- saved time
- reduced fatigue
- discovering an already-existing useful detail
- preserving equipment that was at risk
- gaining a situational bonus for a later check
- improving an NPC's reaction where justified
- helping an ally
- finding a safer route that is consistent with the established map

Possible threat outcomes include:

- lost time
- increased fatigue
- worse position
- noise that alerts an existing nearby threat
- item wear or damage
- losing or dropping an actually-carried item
- a mount becoming stressed
- a cart becoming harder to move
- worsening weather exposure
- reputation consequences where witnesses and social context support them

### Major Positive and Negative Results

Fabula should support rare, high-impact narrative results comparable in function to triumph and despair.

These are not permission for the runtime to invent arbitrary miracles or catastrophes. They must still be resolved from established world state.

A major positive result might create an unusually strong benefit, shortcut, discovery or tactical opening that is possible within canon.

A major negative result might create a serious injury, equipment failure, major delay, loss of position or other substantial complication that follows from the actual situation.

A major positive and major negative result may coexist in the same roll if the final system supports that structure.

## Persistent Consequences

Dice outcomes must feed back into Fabula's persistent simulation rather than disappear after the prose response.

Possible persistent changes include:

- elapsed world time
- injuries and recovery state
- fatigue or other physical state
- money gained or spent
- item loss
- item damage or degradation
- ammunition or consumables used where canon supports them
- reputation changes
- relationship changes when justified
- current position
- route changes
- mount condition and location
- cart condition, load and location
- delays and missed opportunities
- encounter state

If a consequence matters later, it should be stored as state rather than remembered only in generated text.

## Canon Constraint

The dice system is subordinate to Fabula's canon authority rules.

A dice result may not create something that does not exist in canon merely because a symbol needs an interpretation.

The runtime may not invent:

- abilities or powers
- weapons
- items or item categories
- professions
- currencies
- venues
- settlements
- roads
- organizations
- species
- technologies
- historical facts
- world geography
- NPC relationships
- other world facts that are not established

If the roll produces advantage, threat or a major result, the resolver must choose an outcome that can be supported by existing simulation state.

If no valid consequence exists, the result should be expressed through state-neutral factors such as time, position, effort, information already present, or another canon-safe effect rather than inventing new lore.

Only Mouseion may propose new canon additions for later review. Runtime dice resolution cannot create canon.

## Relationship to Travel and World Time

Travel checks must connect to Fabula's existing travel and time simulation.

Terrain, slope, roads, weather, injuries, mounts, carts, carried load and other relevant factors can affect the check.

The result can then affect:

- travel duration
- fatigue
- route position
- mount or cart condition
- exposure to weather
- whether an encounter begins with advantage or disadvantage

Time produced by the result must advance the same world clock used by the rest of Fabula.

## Relationship to Encounters

Encounter resolution must use the player's actual current state.

A character cannot use a weapon, tool, medicine, ability or other resource merely because it would make the scene more interesting. It must actually exist in canon and be available to that character at that moment.

The resolver should consider:

- equipment actually carried or equipped
- injuries
- encumbrance
- terrain
- surprise
- skills
- opponent strength
- mount/cart involvement
- distance and position
- relevant environmental conditions

This applies both to constructing the check and interpreting its narrative result.

## AI Responsibilities

The AI should primarily interpret the resolved result into natural narrative.

It should not secretly decide the desired story outcome first and then manipulate the dice interpretation to reach it.

A future implementation should preferably separate:

1. simulation state collection
2. check construction
3. random resolution
4. mechanical interpretation
5. persistent state update
6. narrative rendering

This makes the system inspectable and reduces the chance that prose generation overrides mechanics.

## Player Presentation

The final UI is not yet decided.

Possible presentation options include:

- visible dice and symbols
- a compact result summary with optional details
- an expandable explanation showing why dice were added or upgraded
- a hidden-roll mode for players who prefer uninterrupted prose

Even when rolls are hidden, the underlying resolution should remain deterministic from the recorded roll and simulation inputs so it can be inspected or debugged.

## Open Design Questions

The following are intentionally not finalized yet:

- exact dice shapes, colors and symbol names
- whether Fabula uses original custom symbols or a mechanically similar internal representation
- exact probability curves
- how attributes and skills construct positive dice
- how difficulty and circumstances construct negative dice
- how opposing checks work
- how degrees of success scale damage, time or quality
- whether players can spend advantage/threat-like results manually or Fabula resolves them automatically
- whether some outcomes offer the player a small choice between several canon-safe consequences
- visibility settings for rolls
- multiplayer handling and simultaneous checks
- logging format for replay, debugging and Mouseion analysis

These should be designed after the surrounding Fabula simulation state model is stable enough to support them.
