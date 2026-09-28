import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState } from '../src/state.mjs';
import { parseRoleplayTurn, submitRoleplayTurn } from '../src/roleplay.mjs';

test('freeform roleplay preserves player prose verbatim', () => {
  const state = createInitialState();
  const text = 'I climb the muddy bank and say "Stay behind me."';
  const result = submitRoleplayTurn(state, text, { seed: 42 });

  assert.equal(result.state.scene.transcript.at(-2).text, text);
  assert.deepEqual(result.parsed.actions, ['climb_muddy_bank']);
  assert.equal(result.receipts.length, 1);
});

test('dialogue-only turns do not force a mechanical roll', () => {
  const parsed = parseRoleplayTurn('I look at Ragna. "Are you coming?"');
  assert.equal(parsed.kind, 'dialogue');
  assert.deepEqual(parsed.actions, []);
});

test('roleplay resolution passes a numeric seed into the authoritative engine', () => {
  const result = submitRoleplayTurn(createInitialState(), 'I climb the muddy bank.', { seed: 77 });

  assert.equal(result.receipts[0].seed, 77);
  assert.equal(result.narrationRequest.authority.mustRespectReceipts, true);
  assert.equal(result.narrationRequest.authority.mayCreateCanon, false);
});
