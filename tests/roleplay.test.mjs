import test from 'node:test';
import assert from 'node:assert/strict';

import { createDemoState } from '../src/state.mjs';
import { parseRoleplayTurn, submitRoleplayTurn } from '../src/roleplay.mjs';

test('freeform roleplay preserves player prose verbatim', () => {
  const state = createDemoState();
  const text = 'I climb the muddy bank and say "Stay behind me."';
  const result = submitRoleplayTurn(state, text, { seed: 42 });
  assert.equal(result.state.scene.transcript[0].text, text);
  assert.deepEqual(result.parsed.actions, ['climb_muddy_bank']);
});

test('dialogue-only turns do not force a mechanical roll', () => {
  const parsed = parseRoleplayTurn('I look at Ragna. "Are you coming?"');
  assert.equal(parsed.kind, 'dialogue');
  assert.deepEqual(parsed.actions, []);
});
