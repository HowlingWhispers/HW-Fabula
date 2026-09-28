import { findInventoryItem } from './state.mjs';

export const ACTIONS = Object.freeze({
  climb_muddy_bank: {
    id: 'climb_muddy_bank',
    label: 'Climb muddy bank',
    skill: 'athletics',
    difficulty: 2,
    description: 'A compact physical-check demo used to exercise state, dice and persistent consequences.'
  },
  move_quietly: {
    id: 'move_quietly',
    label: 'Move quietly',
    skill: 'stealth',
    difficulty: 2,
    description: 'A stealth-oriented demo check using visibility, fatigue and temporary advantages.'
  },
  push_on_trail: {
    id: 'push_on_trail',
    label: 'Push along rough trail',
    skill: 'travel',
    difficulty: 2,
    description: 'A travel-oriented demo check that primarily advances time and fatigue.'
  }
});

export function buildCheck(state, actionId) {
  const action = ACTIONS[actionId];
  if (!action) throw new Error(`Unknown action: ${actionId}`);

  const skill = state.actor.skills[action.skill] ?? 0;
  const reasons = [];
  const pool = {
    ability: Math.max(1, skill),
    difficulty: action.difficulty,
    boost: 0,
    setback: 0
  };

  reasons.push({ source: `${action.skill} skill`, effect: `ability +${pool.ability}` });
  reasons.push({ source: 'base difficulty', effect: `difficulty +${pool.difficulty}` });

  if (state.actor.temporary.nextCheckBoost > 0) {
    pool.boost += state.actor.temporary.nextCheckBoost;
    reasons.push({ source: 'previous advantage', effect: `boost +${state.actor.temporary.nextCheckBoost}` });
  }

  if (state.actor.fatigue >= 2) {
    pool.setback += 1;
    reasons.push({ source: `fatigue ${state.actor.fatigue}`, effect: 'setback +1' });
  }

  if (actionId === 'climb_muddy_bank') {
    const rope = findInventoryItem(state, 'rope');
    if (rope && rope.quantity > 0 && rope.durability > 0) {
      pool.boost += 1;
      reasons.push({ source: 'rope available', effect: 'boost +1' });
    }
    if (state.weather.label.toLowerCase().includes('rain')) {
      pool.setback += 1;
      reasons.push({ source: 'wet ground', effect: 'setback +1' });
    }
  }

  if (actionId === 'move_quietly' && state.weather.visibility === 'poor') {
    pool.boost += 1;
    reasons.push({ source: 'poor visibility', effect: 'boost +1' });
  }

  return { action, pool, reasons };
}
