import test from 'node:test';
import assert from 'node:assert/strict';
import { OrbisAdapter, OrbisAdapterError } from '../src/adapters/orbis-adapter.js';

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
