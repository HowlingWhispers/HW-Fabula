import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCheck } from '../src/actions.mjs';
import { resolveAction } from '../src/engine.mjs';
import { parseRoleplayTurn } from '../src/roleplay.mjs';
import { createStateFromWorldPackage } from '../src/state.mjs';
import { validateWorldPackage } from '../src/world.mjs';

const TEST_WORLD = {
  schemaVersion: 1,
  id: 'orbital-test',
  name: 'Orbital Test',
  economy: {
    currencies: [{ id: 'credits', name: 'Credits', symbol: '¤' }]
  },
  rules: {
    skills: [{ id: 'systems', name: 'Systems' }],
    globalModifiers: [],
    consequenceDefaults: {
      actionMinutes: { success: 1, failure: 2 },
      threatMinutesPerPoint: 0,
      advantageMinutesPerPoint: 0,
      fatigueFromThreat: 0,
      majorNegativeFatiguePerPoint: 0,
      majorPositiveNextCheckBoost: 0
    },
    intents: [
      { actionId: 'override_console', all: ['\\b(override|hack)\\b', '\\b(console|terminal)\\b'] }
    ],
    actions: {
      override_console: {
        id: 'override_console',
        label: 'Override console',
        skill: 'systems',
        difficulty: 1,
        modifiers: [],
        preview: { success: 'The console accepts the override.', failure: 'The console rejects the override.' }
      }
    }
  },
  initialState: {
    clock: { day: 3, minuteOfDay: 120 },
    location: { id: 'bay-4', name: 'Docking Bay 4', detail: 'service gantry' },
    weather: { label: 'Internal atmosphere', visibility: 'clear' },
    actor: {
      id: 'pilot-17',
      name: 'Pilot 17',
      ageYearsAtStart: 31.5,
      health: { current: 6, max: 6 },
      fatigue: 0,
      balances: { credits: 250 },
      skills: { systems: 3 },
      inventory: [{ id: 'multitool', name: 'Multitool', quantity: 1, durability: 100, tags: ['technical'] }]
    },
    scene: {
      id: 'bay-scene',
      transcript: [{ speaker: 'narrator', text: 'The service console hums beside the sealed hatch.' }]
    }
  }
};

test('state is created entirely from a supplied non-Bitterroot package', () => {
  const state = createStateFromWorldPackage(TEST_WORLD, { instanceId: 'test-instance' });
  assert.equal(state.meta.worldId, 'orbital-test');
  assert.equal(state.meta.worldName, 'Orbital Test');
  assert.equal(state.location.name, 'Docking Bay 4');
  assert.equal(state.actor.name, 'Pilot 17');
  assert.equal(state.actor.balances.credits, 250);
  assert.equal(state.actor.balances.coin, undefined);
});

test('check construction reads action and skill from the supplied package', () => {
  const state = createStateFromWorldPackage(TEST_WORLD);
  const check = buildCheck(state, TEST_WORLD, 'override_console');
  assert.equal(check.action.skill, 'systems');
  assert.equal(check.pool.ability, 3);
  assert.equal(check.pool.difficulty, 1);
});

test('roleplay intent mapping is package data rather than Fabula core vocabulary', () => {
  const parsed = parseRoleplayTurn(TEST_WORLD, 'I try to hack the terminal before the hatch locks.');
  assert.deepEqual(parsed.actions, ['override_console']);
});

test('the authoritative resolver runs the unrelated package without core changes', () => {
  const state = createStateFromWorldPackage(TEST_WORLD);
  const result = resolveAction(state, TEST_WORLD, 'override_console', 42);
  assert.equal(result.receipt.worldId, 'orbital-test');
  assert.equal(result.receipt.action.id, 'override_console');
  assert.ok(result.state.clock.totalMinutes > state.clock.totalMinutes);
});

test('invalid packages fail before a runtime instance is created', () => {
  assert.throws(() => validateWorldPackage({ id: 'broken' }), /Invalid Fabula world package/);
});
