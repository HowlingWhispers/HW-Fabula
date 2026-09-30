import test from 'node:test';
import assert from 'node:assert/strict';
import { FabulaRuntime } from '../src/runtime/fabula-runtime.js';

test('community view cannot be activated when the world owner disabled it', () => {
  const runtime = new FabulaRuntime({
    worldId: 'world-1',
    playerId: 'player-1',
    instanceId: 'instance-1',
    canonMode: 'community',
    policy: { allowCommunityLayer: false },
  });

  assert.equal(runtime.snapshot().canonMode, 'player-canon');
  assert.throws(() => runtime.setCanonMode('community'), /Community Layer disabled/);
});

test('clean canon mode survives save export and restore', async () => {
  const runtime = new FabulaRuntime({
    worldId: 'world-1',
    playerId: 'player-1',
    instanceId: 'instance-1',
    canonMode: 'clean',
  });
  const save = runtime.exportSave();

  const restored = new FabulaRuntime({
    worldId: 'world-1',
    playerId: 'player-1',
    instanceId: 'instance-1',
  });
  await restored.importSave(save);
  assert.equal(restored.snapshot().canonMode, 'clean');
});
