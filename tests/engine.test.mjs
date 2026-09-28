import test from 'node:test';
import assert from 'node:assert/strict';
import { createStateFromWorldPackage } from '../src/state.mjs';
import { buildCheck } from '../src/actions.mjs';
import { rollNarrativePool } from '../src/dice.mjs';
import { resolveAction } from '../src/engine.mjs';
import { WORLD_PACKAGE } from '../worlds/bitterroot-demo/world.mjs';

test('dice are deterministic from a recorded seed', () => {
  const pool = { ability: 2, difficulty: 2, boost: 1, setback: 1 };
  assert.deepEqual(rollNarrativePool(pool, 123456), rollNarrativePool(pool, 123456));
});

test('check is built from demo package state and rules', () => {
  const state = createStateFromWorldPackage(WORLD_PACKAGE);
  const check = buildCheck(state, WORLD_PACKAGE, 'climb_muddy_bank');
  assert.equal(check.pool.ability, 2);
  assert.equal(check.pool.difficulty, 2);
  assert.equal(check.pool.boost, 1);
  assert.equal(check.pool.setback, 2);
  assert.ok(check.reasons.some((reason) => reason.source === 'climbing equipment available'));
});

test('resolution mutates copied state and records a receipt', () => {
  const original = createStateFromWorldPackage(WORLD_PACKAGE);
  const beforeTime = original.clock.totalMinutes;
  const { state, receipt } = resolveAction(original, WORLD_PACKAGE, 'climb_muddy_bank', 42);

  assert.equal(original.clock.totalMinutes, beforeTime, 'input state must remain unchanged');
  assert.ok(state.clock.totalMinutes > beforeTime, 'world time must advance');
  assert.equal(state.lastResolution.id, receipt.id);
  assert.equal(receipt.worldId, WORLD_PACKAGE.id);
  assert.equal(receipt.narratorAuthority.canAlterOutcome, false);
  assert.equal(receipt.narratorAuthority.canCreateCanon, false);
  assert.equal(state.eventLog.at(-1).type, 'resolution');
});

test('advantage and threat are mutually netted while major results remain independent', () => {
  for (let seed = 1; seed < 500; seed += 1) {
    const result = rollNarrativePool({ ability: 3, difficulty: 3, boost: 1, setback: 1 }, seed);
    assert.ok(!(result.outcome.advantage > 0 && result.outcome.threat > 0));
    assert.ok(result.outcome.majorPositive >= 0);
    assert.ok(result.outcome.majorNegative >= 0);
  }
});
