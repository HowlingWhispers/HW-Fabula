import test from 'node:test';
import assert from 'node:assert/strict';
import { OrbisAdapter, OrbisAdapterError } from '../src/adapters/orbis-adapter.js';
import { NPCRegistry } from '../src/runtime/npc-registry.js';

function response(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => typeof body === 'string' ? body : JSON.stringify(body),
  };
}

test('OrbisAdapter resolves a world and loads canonical children from /api/v1/library', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/api/v1/library/assets?')) return response({ items: [{ id: 'world-1', type: 'world', name: 'Bitterroot' }] });
    if (String(url).endsWith('/api/v1/library/assets/world-1/children')) return response({ locations: [
      { id: 'hollowmere', libraryAssetId: 'place-1', name: 'Hollowmere', description: 'A market settlement.' },
      { id: 'bakery', libraryAssetId: 'place-2', name: 'Bakery', parentLocationId: 'place-1', description: 'Warm bread and flour.' },
    ], species: [], factions: [], societies: [], families: [], memories: [] });
    if (String(url).endsWith('/api/v1/library/assets/world-1')) return response({ id: 'world-1', type: 'world', name: 'Bitterroot', summary: 'Living dark fantasy.' });
    throw new Error(`Unexpected URL ${url}`);
  };
  const adapter = new OrbisAdapter({ baseUrl: 'https://orbis.example', fetchImpl });
  const world = await adapter.findWorldByName('Bitterroot');
  assert.equal(world.id, 'world-1');
  const loaded = await adapter.loadWorld(world.id);
  assert.equal(loaded.name, 'Bitterroot');
  assert.equal(loaded.locations.length, 2);
  assert.equal(loaded.placeById.get('place-2').id, 'bakery');
  assert.equal(loaded.placeById.get('bakery').parentLocationId, 'hollowmere');
  assert.ok(calls.every((url) => url.includes('/api/v1/library/')));
});

test('OrbisAdapter keeps the platform fetch bound to globalThis', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function platformFetch() {
    if (this !== globalThis) throw new TypeError('Illegal invocation');
    return response({ items: [] });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const adapter = new OrbisAdapter({ baseUrl: 'https://orbis.example' });
  const worlds = await adapter.listWorlds();
  assert.deepEqual(worlds, []);
});

test('OrbisAdapter loads canonical NPC children and maps them by place', async () => {
  const fetchImpl = async (url) => {
    if (String(url).endsWith('/api/v1/library/assets/world-1/children')) {
      return response({
        locations: [
          { id: 'station', libraryAssetId: 'place-1', name: 'Brackenjaw Ranger Station', parentLocationId: null, description: 'Ragna works here.' },
          { id: 'town', libraryAssetId: 'place-2', name: 'Hollowmere', parentLocationId: null, description: 'A market.' },
        ],
        npcs: [
          { id: 'npc-ragna', libraryAssetId: 'char-1', name: 'Ragna Holt', aliases: ['Ragna'], workLocationId: 'place-1', role: 'Ranger' },
          { id: 'npc-jorah', name: 'Jorah', locationId: 'town', role: 'Traveler' },
        ],
        species: [], factions: [], societies: [], families: [], memories: []
      });
    }
    if (String(url).endsWith('/api/v1/library/assets/world-1')) {
      return response({ id: 'world-1', type: 'world', name: 'Bitterroot' });
    }
    throw new Error(`Unexpected URL ${url}`);
  };
  const adapter = new OrbisAdapter({ baseUrl: 'https://orbis.example', fetchImpl });
  const loaded = await adapter.loadWorld('world-1');
  assert.equal(loaded.npcs.length, 2);
  const ragna = loaded.npcs.find((n) => n.id === 'npc-ragna');
  assert.equal(ragna.workLocationId, 'station');
  const jorah = loaded.npcs.find((n) => n.id === 'npc-jorah');
  assert.equal(jorah.locationId, 'town');
  const registry = new NPCRegistry({ npcs: loaded.npcs, placeById: loaded.placeById });
  assert.equal(registry.isPresentAt(ragna, 'station'), true);
  assert.equal(registry.isPresentAt(ragna, 'town'), false);
});

test('OrbisAdapter rejects a successful non-API page instead of reporting zero worlds', async () => {
  const adapter = new OrbisAdapter({
    baseUrl: 'https://orbis.example',
    fetchImpl: async () => response('<!doctype html><html></html>'),
  });
  await assert.rejects(() => adapter.listWorlds(), (error) => {
    assert.ok(error instanceof OrbisAdapterError);
    assert.match(error.message, /unexpected response/i);
    return true;
  });
});
