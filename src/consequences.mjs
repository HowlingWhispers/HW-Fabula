import { advanceClock, findInventoryItemByTag } from './state.mjs';
import { validateWorldPackage } from './world.mjs';

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

export function applyConsequences(state, worldPackage, check, roll) {
  const world = validateWorldPackage(worldPackage);
  const defaults = world.rules.consequenceDefaults ?? {};
  const actionConfig = check.action.consequences ?? {};
  const outcome = roll.outcome;
  const mutations = [];

  const baseMinutes = defaults.actionMinutes ?? { success: 5, failure: 8 };
  let minutes = outcome.success
    ? Number(baseMinutes.success ?? 5)
    : Number(baseMinutes.failure ?? 8);

  if (outcome.threat > 0) {
    const perPoint = Number(defaults.threatMinutesPerPoint ?? 2);
    const max = Number(defaults.threatMinutesMax ?? 4);
    minutes += Math.min(max, outcome.threat * perPoint);
  }

  if (outcome.advantage > 0) {
    const perPoint = Number(defaults.advantageMinutesPerPoint ?? 1);
    const max = Number(defaults.advantageMinutesMax ?? 3);
    minutes = Math.max(0, minutes - Math.min(max, outcome.advantage * perPoint));
  }

  const beforeTime = state.clock.totalMinutes;
  advanceClock(state, minutes);
  addMutation(mutations, 'clock.totalMinutes', beforeTime, state.clock.totalMinutes, 'action duration');

  const beforeFatigue = Number(state.actor.fatigue ?? 0);
  let fatigue = beforeFatigue;

  if (outcome.threat > 0 && Number(defaults.fatigueFromThreat ?? 0) > 0) {
    fatigue += Number(defaults.fatigueFromThreat);
  }

  if (!outcome.success && actionConfig.fatigueOnFailure) {
    fatigue += Number(actionConfig.failureFatigue ?? 1);
  }

  const recoverAt = Number(defaults.recoverFatigueAtAdvantage ?? 0);
  if (recoverAt > 0 && outcome.advantage >= recoverAt) {
    fatigue -= 1;
  }

  if (outcome.majorNegative > 0) {
    fatigue += outcome.majorNegative * Number(defaults.majorNegativeFatiguePerPoint ?? 0);
  }

  state.actor.fatigue = Math.max(0, Math.min(10, fatigue));
  addMutation(mutations, 'actor.fatigue', beforeFatigue, state.actor.fatigue, 'configured effort / secondary result');

  const beforeBoost = Number(state.actor.temporary?.nextCheckBoost ?? 0);
  let nextBoost = 0;

  if (defaults.carryBoostOnFailureWithAdvantage && !outcome.success && outcome.advantage > 0) {
    nextBoost = 1;
  }

  if (outcome.majorPositive > 0) {
    nextBoost = Math.max(nextBoost, Number(defaults.majorPositiveNextCheckBoost ?? 0));
  }

  state.actor.temporary.nextCheckBoost = nextBoost;
  addMutation(mutations, 'actor.temporary.nextCheckBoost', beforeBoost, nextBoost, 'configured carry-over result');

  const durability = actionConfig.threatDurability;
  if (durability && outcome.threat > 0) {
    const item = findInventoryItemByTag(state, durability.inventoryTag);
    if (item && item.durability != null) {
      const before = item.durability;
      const loss = Math.min(
        Number(durability.maxLoss ?? 8),
        Number(durability.baseLoss ?? 0) + outcome.threat
      );
      item.durability = Math.max(0, item.durability - loss);
      addMutation(
        mutations,
        `actor.inventory.${item.id}.durability`,
        before,
        item.durability,
        durability.reason ?? 'configured threat durability loss'
      );
    }
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
