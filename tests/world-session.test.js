import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldSession } from '../src/runtime/world-session.js';

const world = {
  id: 'world-1',
  name: 'Bitterroot',
  summary: 'Test world',
  sourceType: 'public-curated',
  contentRating: 'sfw',
  updatedAt: null,
  locations: [
    { id: 'hollowmere', libraryAssetId: 'p1', name: 'Hollowmere', description: 'A market settlement.', parentLocationId: null, tags: [] },
    { id: 'bakery', libraryAssetId: 'p2', name: 'Bakery', description: 'Warm bread and flour.', parentLocationId: 'hollowmere', tags: [] },
    { id: 'market', libraryAssetId: 'p3', name: 'Market', description: 'Busy stalls.', parentLocationId: 'hollowmere', tags: [] },
    { id: 'wilds', libraryAssetId: 'p4', name: 'Eastern Wilds', description: 'Far country.', parentLocationId: null, tags: [] },
  ],
};
world.placeById = new Map();
for (const place of world.locations) {
  world.placeById.set(place.id, place);
  world.placeById.set(place.libraryAssetId, place);
}
const adapter = { loadWorld: async () => world };

async function session() {
  const value = new WorldSession({ adapter, worldId: 'world-1', playerId: 'player', instanceId: 'save1', now: () => new Date('2026-09-30T10:00:00Z') });
  await value.loadWorld();
  value.startAt('hollowmere');
  return value;
}

test('starts at an Orbis place and exposes only structural exits', async () => {
  const value = await session();
  const snap = value.snapshot();
  assert.equal(snap.currentPlace.name, 'Hollowmere');
  assert.deepEqual(snap.exits.map((p) => p.name).sort(), ['Bakery', 'Market']);
});

test('moves through parent/child hierarchy and can leave back to parent', async () => {
  const value = await session();
  const enter = value.act('enter bakery');
  assert.equal(enter.ok, true);
  assert.equal(value.snapshot().currentPlace.name, 'Bakery');
  assert.equal(enter.firstVisit, true);
  const leave = value.act('leave');
  assert.equal(leave.ok, true);
  assert.equal(value.snapshot().currentPlace.name, 'Hollowmere');
});

test('refuses to invent a route or teleport to a remote canonical place', async () => {
  const value = await session();
  const result = value.act('travel to Eastern Wilds');
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'route-not-loaded');
  assert.equal(value.snapshot().currentPlace.name, 'Hollowmere');
});

test('unknown freeform input changes no authoritative location state', async () => {
  const value = await session();
  const before = value.snapshot().state.currentPlaceId;
  const result = value.act('I whistle an ancient spell and become mayor');
  assert.equal(result.kind, 'unresolved');
  assert.equal(value.snapshot().state.currentPlaceId, before);
});

test('save state restores only if the canonical place still exists', async () => {
  const first = await session();
  first.act('enter bakery');
  const saved = first.exportState();
  const second = new WorldSession({ adapter, worldId: 'world-1', playerId: 'player', instanceId: 'save1' });
  await second.loadWorld();
  second.restoreState(saved);
  assert.equal(second.snapshot().currentPlace.name, 'Bakery');
  assert.equal(second.snapshot().state.turnNumber, 1);
});
