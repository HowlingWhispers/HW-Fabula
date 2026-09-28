import { findInventoryItemByTag } from './state.mjs';
import { validateWorldPackage } from './world.mjs';

function modifierApplies(state, modifier) {
  switch (modifier.when) {
    case 'inventoryTag':
      return Boolean(findInventoryItemByTag(state, modifier.tag));
    case 'weatherIncludes':
      return String(state.weather?.label ?? '').toLowerCase().includes(String(modifier.value ?? '').toLowerCase());
    case 'visibilityEquals':
      return String(state.weather?.visibility ?? '').toLowerCase() === String(modifier.value ?? '').toLowerCase();
    case 'actorStatAtLeast':
      return Number(state.actor?.[modifier.stat] ?? 0) >= Number(modifier.value ?? 0);
    default:
      return false;
  }
}

function applyModifier(state, pool, reasons, modifier) {
  if (!modifierApplies(state, modifier)) return;
  if (!Object.prototype.hasOwnProperty.call(pool, modifier.die)) return;

  const count = Math.max(0, Number(modifier.count ?? 1));
  pool[modifier.die] += count;
  reasons.push({
    source: modifier.reason ?? modifier.when,
    effect: `${modifier.die} +${count}`
  });
}

export function getAction(worldPackage, actionId) {
  const world = validateWorldPackage(worldPackage);
  return world.rules.actions?.[actionId] ?? null;
}

export function buildCheck(state, worldPackage, actionId) {
  const world = validateWorldPackage(worldPackage);
  const action = world.rules.actions?.[actionId];
  if (!action) throw new Error(`Unknown action for world ${world.id}: ${actionId}`);

  const skill = Number(state.actor.skills?.[action.skill] ?? 0);
  const reasons = [];
  const pool = {
    ability: Math.max(1, skill),
    difficulty: Math.max(0, Number(action.difficulty ?? 0)),
    boost: 0,
    setback: 0
  };

  reasons.push({ source: `${action.skill} skill`, effect: `ability +${pool.ability}` });
  reasons.push({ source: 'base difficulty', effect: `difficulty +${pool.difficulty}` });

  if (state.actor.temporary?.nextCheckBoost > 0) {
    pool.boost += state.actor.temporary.nextCheckBoost;
    reasons.push({ source: 'previous advantage', effect: `boost +${state.actor.temporary.nextCheckBoost}` });
  }

  for (const modifier of world.rules.globalModifiers ?? []) {
    applyModifier(state, pool, reasons, modifier);
  }

  for (const modifier of action.modifiers ?? []) {
    applyModifier(state, pool, reasons, modifier);
  }

  return { action: structuredClone(action), pool, reasons };
}

export function listActions(worldPackage) {
  const world = validateWorldPackage(worldPackage);
  return Object.values(world.rules.actions ?? {}).map((action) => structuredClone(action));
}
