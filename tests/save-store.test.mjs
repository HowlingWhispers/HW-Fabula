import test from 'node:test';
import assert from 'node:assert/strict';

import { loadSlot, saveSlot, slotMetadata } from '../web/save-store.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

test('save slots are scoped by world id', () => {
  const storage = memoryStorage();
  saveSlot(storage, 'world-a', 'slot1', { marker: 'A' });
  saveSlot(storage, 'world-b', 'slot1', { marker: 'B' });

  assert.equal(loadSlot(storage, 'world-a', 'slot1').state.marker, 'A');
  assert.equal(loadSlot(storage, 'world-b', 'slot1').state.marker, 'B');
});

test('slot metadata reports occupied and empty manual slots', () => {
  const storage = memoryStorage();
  saveSlot(storage, 'world-a', 'slot6', { marker: 'six' });
  const metadata = slotMetadata(storage, 'world-a');

  assert.equal(metadata.find((slot) => slot.id === 'slot6').occupied, true);
  assert.equal(metadata.find((slot) => slot.id === 'slot1').occupied, false);
});
