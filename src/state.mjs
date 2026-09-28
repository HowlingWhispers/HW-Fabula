import { validateWorldPackage } from './world.mjs';

const YEAR_MINUTES = 365.2425 * 24 * 60;

export function createStateFromWorldPackage(inputWorld, options = {}) {
  const world = validateWorldPackage(inputWorld);
  const seed = structuredClone(world.initialState);
  const day = Number(seed.clock.day ?? 0);
  const minuteOfDay = Number(seed.clock.minuteOfDay ?? 0);
  const totalMinutes = (day * 1440) + minuteOfDay;
  const actor = seed.actor;
  const ageYearsAtStart = Number(actor.ageYearsAtStart ?? 0);

  const transcript = (seed.scene?.transcript ?? []).map((entry, index) => ({
    id: entry.id ?? `scene-${index + 1}`,
    speaker: entry.speaker ?? 'narrator',
    text: String(entry.text ?? ''),
    at: Number(entry.at ?? totalMinutes)
  }));

  return {
    schemaVersion: 3,
    meta: {
      worldId: world.id,
      worldName: world.name,
      worldPackageSchemaVersion: world.schemaVersion,
      instanceId: options.instanceId ?? `${world.id}-local-instance`,
      personaId: options.personaId ?? actor.id
    },
    clock: {
      day,
      minuteOfDay,
      totalMinutes
    },
    location: structuredClone(seed.location),
    weather: structuredClone(seed.weather ?? { label: 'Unknown', visibility: 'normal' }),
    actor: {
      id: actor.id,
      name: actor.name,
      birthWorldMinute: totalMinutes - (ageYearsAtStart * YEAR_MINUTES),
      health: structuredClone(actor.health ?? { current: 1, max: 1 }),
      fatigue: Number(actor.fatigue ?? 0),
      balances: structuredClone(actor.balances ?? {}),
      skills: structuredClone(actor.skills ?? {}),
      inventory: structuredClone(actor.inventory ?? []),
      temporary: {
        nextCheckBoost: 0,
        ...(structuredClone(actor.temporary ?? {}))
      }
    },
    encounter: structuredClone(seed.encounter ?? null),
    scene: {
      id: seed.scene?.id ?? 'scene',
      transcript
    },
    lastResolution: null,
    eventLog: [
      {
        at: totalMinutes,
        type: 'system',
        text: `Fabula instance initialized from world package ${world.id}.`
      }
    ]
  };
}

export function normalizeState(input, worldPackage = null) {
  if (!input) {
    if (!worldPackage) throw new Error('normalizeState requires state or a world package');
    return createStateFromWorldPackage(worldPackage);
  }

  const state = structuredClone(input);
  state.schemaVersion = 3;
  state.scene ??= { id: 'scene', transcript: [] };
  state.scene.transcript ??= [];
  state.eventLog ??= [];
  state.actor ??= {};
  state.actor.inventory ??= [];
  state.actor.skills ??= {};
  state.actor.temporary ??= { nextCheckBoost: 0 };
  state.actor.temporary.nextCheckBoost ??= 0;
  state.actor.balances ??= {};

  // One-way migration for the earliest prototype save shape.
  if (state.actor.coin != null && state.actor.balances.coin == null) {
    state.actor.balances.coin = state.actor.coin;
    delete state.actor.coin;
  }

  return state;
}

export function cloneState(state) {
  return structuredClone(state);
}

export function formatWorldTime(clock) {
  const hours = Math.floor(clock.minuteOfDay / 60);
  const minutes = clock.minuteOfDay % 60;
  return `DAY ${clock.day} · ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function ageInYears(state) {
  return (state.clock.totalMinutes - state.actor.birthWorldMinute) / YEAR_MINUTES;
}

export function advanceClock(state, minutes) {
  state.clock.totalMinutes += minutes;
  state.clock.minuteOfDay += minutes;

  while (state.clock.minuteOfDay >= 1440) {
    state.clock.minuteOfDay -= 1440;
    state.clock.day += 1;
  }
}

export function findInventoryItem(state, itemId) {
  return state.actor.inventory.find((item) => item.id === itemId) ?? null;
}

export function findInventoryItemByTag(state, tag) {
  return state.actor.inventory.find((item) => item.quantity > 0 && item.durability !== 0 && item.tags?.includes(tag)) ?? null;
}
