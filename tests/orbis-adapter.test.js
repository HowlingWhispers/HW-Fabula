import test from 'node:test';
import assert from 'node:assert/strict';
import { OrbisAdapter } from '../src/adapters/orbis-adapter.js';

function response(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

test('OrbisAdapter resolves a world and loads canonical children', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/assets?')) return response({ items: [{ id: 'world-1', type: 'world', name: 'Bitterroot' }] });
    if (String(url).endsWith('/assets/world-1/children')) return response({ locations: [
      { id: 'hollowmere', libraryAssetId: 'place-1', name: 'Hollowmere', description: 'A market settlement.' },
      { id: 'bakery', libraryAssetId: 'place-2', name: 'Bakery', parentLocationId: 'hollowmere', description: 'Warm bread and flour.' },
    ], species: [], factions: [], societies: [], families: [], memories: [] });
    if (String(url).endsWith('/assets/world-1')) return response({ id: 'world-1', type: 'world', name: 'Bitterroot', summary: 'Living dark fantasy.' });
    throw new Error(`Unexpected URL ${url}`);
  };
  const adapter = new OrbisAdapter({ baseUrl: 'https://orbis.example', fetchImpl });
  const world = await adapter.findWorldByName('Bitterroot');
  assert.equal(world.id, 'world-1');
  const loaded = await adapter.loadWorld(world.id);
  assert.equal(loaded.name, 'Bitterroot');
  assert.equal(loaded.locations.length, 2);
  assert.equal(loaded.placeById.get('place-2').id, 'bakery');
  assert.ok(calls.some((url) => url.includes('type=world')));
});
