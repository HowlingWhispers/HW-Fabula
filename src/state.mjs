const YEAR_MINUTES = 365.2425 * 24 * 60;

export function createInitialState() {
  const totalMinutes = (12 * 24 * 60) + (8 * 60) + 36;
  const ageYears = 17.365;

  return {
    schemaVersion: 1,
    meta: {
      worldId: 'bitterroot-demo',
      worldName: 'Bitterroot',
      instanceId: 'fabula-prealpha-demo',
      personaId: 'eirvargr'
    },
    clock: {
      day: 12,
      minuteOfDay: (8 * 60) + 36,
      totalMinutes
    },
    location: {
      id: 'hollowmere',
      name: 'Hollowmere',
      detail: 'market edge'
    },
    weather: {
      label: 'Light rain',
      visibility: 'poor'
    },
    actor: {
      id: 'eirvargr',
      name: 'Eirvargr',
      birthWorldMinute: totalMinutes - (ageYears * YEAR_MINUTES),
      health: { current: 10, max: 10 },
      fatigue: 2,
      coin: 14,
      skills: {
        athletics: 2,
        stealth: 2,
        travel: 1
      },
      inventory: [
        { id: 'rope', name: 'Rope', quantity: 1, durability: 87, tags: ['climbing'] },
        { id: 'knife', name: 'Knife', quantity: 1, durability: 94, tags: ['tool'] },
        { id: 'bread', name: 'Bread', quantity: 2, durability: null, tags: ['food'] }
      ],
      temporary: {
        nextCheckBoost: 0
      }
    },
    encounter: null,
    lastResolution: null,
    eventLog: [
      { at: totalMinutes - 10, type: 'location', text: 'Arrived at Hollowmere market edge.' },
      { at: totalMinutes, type: 'system', text: 'Fabula Pre-Alpha state initialized.' }
    ]
  };
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
