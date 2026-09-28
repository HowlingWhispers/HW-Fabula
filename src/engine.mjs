import { buildCheck, listActions as listWorldActions } from './actions.mjs';
import { applyConsequences } from './consequences.mjs';
import { rollNarrativePool } from './dice.mjs';
import { cloneState } from './state.mjs';

export function resolveAction(currentState, worldPackage, actionId, seed) {
  const state = cloneState(currentState);
  const check = buildCheck(state, worldPackage, actionId);
  const roll = rollNarrativePool(check.pool, seed);

  if (currentState.actor.temporary?.nextCheckBoost > 0) {
    state.actor.temporary.nextCheckBoost = 0;
  }

  const consequence = applyConsequences(state, worldPackage, check, roll);
  const receipt = {
    id: `fb_${state.clock.totalMinutes}_${roll.seed.toString(16).padStart(8, '0')}`,
    schemaVersion: 2,
    worldId: state.meta.worldId,
    action: {
      id: check.action.id,
      label: check.action.label,
      skill: check.action.skill
    },
    seed: roll.seed,
    pool: check.pool,
    reasons: check.reasons,
    dice: roll.dice,
    totals: roll.totals,
    outcome: roll.outcome,
    classification: consequence.classification,
    mutations: consequence.mutations,
    narratorAuthority: {
      canDescribe: true,
      canAlterOutcome: false,
      canCreateCanon: false
    }
  };

  state.lastResolution = receipt;
  state.eventLog.push({
    at: state.clock.totalMinutes,
    type: 'resolution',
    text: `${check.action.label}: ${consequence.classification}`
  });

  return { state, receipt };
}

export function listActions(worldPackage) {
  return listWorldActions(worldPackage);
}
