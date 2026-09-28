import { advanceClock, findInventoryItem } from './state.mjs';

function classify(outcome) {
  if (outcome.success && outcome.threat > 0) return 'SUCCESS + THREAT';
  if (outcome.success && outcome.advantage > 0) return 'SUCCESS + ADVANTAGE';
  if (!outcome.success && outcome.advantage > 0) return 'FAILURE + ADVANTAGE';
  if (!outcome.success && outcome.threat > 0) return 'FAILURE + THREAT';
  return outcome.success ? 'SUCCESS' : 'FAILURE';
}

function addMutation(mutations, path, before, after, reason) {
  if (before === after) return;
  mutations.push({ path, before, after, reason });
}

export function applyConsequences(state, check, roll) {
  const outcome = roll.outcome;
  const mutations = [];
  const actionId = check.action.id;
  let minutes = outcome.success ? 5 : 8;

  if (outcome.threat > 0) minutes += Math.min(4, outcome.threat * 2);
  if (outcome.advantage > 0) minutes = Math.max(2, minutes - Math.min(3, outcome.advantage));

  const beforeTime = state.clock.totalMinutes;
  advanceClock(state, minutes);
  addMutation(mutations, 'clock.totalMinutes', beforeTime, state.clock.totalMinutes, 'action duration');

  const beforeFatigue = state.actor.fatigue;
  if (outcome.threat > 0 || (!outcome.success && actionId === 'push_on_trail')) {
    state.actor.fatigue = Math.min(10, state.actor.fatigue + 1);
  } else if (outcome.advantage >= 2 && state.actor.fatigue > 0) {
    state.actor.fatigue -= 1;
  }
  addMutation(mutations, 'actor.fatigue', beforeFatigue, state.actor.fatigue, 'effort / secondary result');

  const beforeBoost = state.actor.temporary.nextCheckBoost;
  state.actor.temporary.nextCheckBoost = (!outcome.success && outcome.advantage > 0) ? 1 : 0;
  addMutation(mutations, 'actor.temporary.nextCheckBoost', beforeBoost, state.actor.temporary.nextCheckBoost, 'carry-over advantage');

  if (actionId === 'climb_muddy_bank' && outcome.threat > 0) {
    const rope = findInventoryItem(state, 'rope');
    if (rope && rope.durability !== null) {
      const before = rope.durability;
      rope.durability = Math.max(0, rope.durability - Math.min(8, 2 + outcome.threat));
      addMutation(mutations, 'actor.inventory.rope.durability', before, rope.durability, 'rope strained during climb');
    }
  }

  if (roll.outcome.majorNegative > 0) {
    const before = state.actor.fatigue;
    state.actor.fatigue = Math.min(10, state.actor.fatigue + roll.outcome.majorNegative);
    addMutation(mutations, 'actor.fatigue', before, state.actor.fatigue, 'major negative result');
  }

  if (roll.outcome.majorPositive > 0) {
    const before = state.actor.temporary.nextCheckBoost;
    state.actor.temporary.nextCheckBoost = Math.max(state.actor.temporary.nextCheckBoost, 1);
    addMutation(mutations, 'actor.temporary.nextCheckBoost', before, state.actor.temporary.nextCheckBoost, 'major positive result');
  }

  return {
    classification: classify(outcome),
    mutations,
    summary: {
      minutes,
      fatigueDelta: state.actor.fatigue - beforeFatigue
    }
  };
}
