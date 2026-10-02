import test from 'node:test';
import assert from 'node:assert/strict';
import { FabulaRuntime } from '../src/runtime/fabula-runtime.js';
import { WorldSession } from '../src/runtime/world-session.js';
import { NPCRegistry } from '../src/runtime/npc-registry.js';

function placeById(locations) {
  const byId = new Map();
  for (const place of locations) {
    byId.set(place.id, place);
    if (place.libraryAssetId) byId.set(place.libraryAssetId, place);
  }
  return byId;
}

const places = [
  { id: 'hollowmere', libraryAssetId: 'p-hm', name: 'Hollowmere', description: 'A market settlement. Tamsin used to run a stall here.', parentLocationId: null, tags: [] },
  { id: 'brackenjaw', libraryAssetId: 'p-br', name: 'Brackenjaw Ranger Station', description: 'A weathered ranger station. Ragna works the day shift here, sorting patrol logs.', parentLocationId: 'hollowmere', tags: [] },
  { id: 'old-road', libraryAssetId: 'p-or', name: 'Old Road', description: 'A long, quiet road. The vanished keeper Kael once patrolled it.', parentLocationId: 'hollowmere', tags: [] },
];

const npcs = [
  { id: 'npc-ragna', libraryAssetId: 'char-ragna', name: 'Ragna Holt', aliases: ['Ragna'], workLocationId: 'brackenjaw', role: 'Ranger', tags: ['ranger'] },
  { id: 'npc-jorah', name: 'Jorah', locationId: 'hollowmere', role: 'Traveler', aliases: ['Jorah'] },
  { id: 'npc-tamsin', libraryAssetId: 'char-tamsin', name: 'Tamsin', aliases: ['Tamsin'], homeLocationId: 'old-road', role: 'Trader', tags: ['merchant'] },
];

const world = {
  id: 'world-bitterroot',
  name: 'Bitterroot',
  summary: 'Living dark fantasy.',
  sourceType: 'public-curated',
  contentRating: 'sfw',
  updatedAt: null,
  document: {},
  locations: places,
  placeById: placeById(places),
  npcs,
};

const adapter = { loadWorld: async () => world };

function session(startPlace = 'brackenjaw') {
  const value = new WorldSession({ adapter, worldId: 'world-bitterroot', playerId: 'player-1', instanceId: 'inst-1', now: () => new Date('2026-09-30T10:00:00Z') });
  return value.loadWorld().then(() => { value.startAt(startPlace); return value; });
}

test('NPCRegistry resolves by full name, alias, id, and library asset id', async () => {
  const registry = new NPCRegistry({ npcs, placeById: world.placeById });
  assert.equal(registry.resolveNPC('Ragna Holt').id, 'npc-ragna');
  assert.equal(registry.resolveNPC('Ragna').id, 'npc-ragna');
  assert.equal(registry.resolveNPC('npc-ragna').id, 'npc-ragna');
  assert.equal(registry.resolveNPC('char-tamsin').id, 'npc-tamsin');
  assert.equal(registry.resolveNPC('Jorah').id, 'npc-jorah');
  assert.equal(registry.resolveNPC('Nobody'), null);
});

test('NPCRegistry.resolveNPCName matches exact name/alias only, with no substring invention', () => {
  const registry = new NPCRegistry({ npcs, placeById: world.placeById });
  assert.equal(registry.resolveNPCName('Ragna')?.id, 'npc-ragna');
  assert.equal(registry.resolveNPCName('ragna')?.id, 'npc-ragna');
  assert.equal(registry.resolveNPCName('Ragna Holt')?.id, 'npc-ragna');
  assert.equal(registry.resolveNPCName('Rag') ?? null, null);
  assert.equal(registry.resolveNPCName('Ragnolia') ?? null, null);
});

test('NPCRegistry presence is canonical, not prose-inferred', () => {
  const registry = new NPCRegistry({ npcs, placeById: world.placeById });
  assert.equal(registry.isPresentAt(registry.resolveNPC('Ragna'), 'brackenjaw'), true);
  assert.equal(registry.isPresentAt(registry.resolveNPC('Ragna'), 'hollowmere'), false);
  assert.deepEqual(registry.presentNPCs('brackenjaw').map((n) => n.id).sort(), ['npc-ragna']);
  assert.deepEqual(registry.presentNPCs('hollowmere').map((n) => n.id).sort(), ['npc-jorah']);
  assert.deepEqual(registry.presentNPCs('old-road').map((n) => n.id).sort(), ['npc-tamsin']);
});

test('Ragna works at Brackenjaw so she is present there, not because the description names her', async () => {
  const sess = await session('brackenjaw');
  const snap = sess.snapshot();
  assert.deepEqual(snap.presentNPCs.map((n) => n.name), ['Ragna Holt']);
});

test('freeform "Ragna I need to speak to you" routes as conversation when she is present', async () => {
  const sess = await session('brackenjaw');
  const result = sess.act('Ragna I need to speak to you');
  assert.equal(result.ok, true);
  assert.equal(result.kind, 'conversation');
  assert.equal(result.referencedNPC.name, 'Ragna Holt');
  assert.equal(result.conversation.presence, 'present');
  assert.equal(result.conversation.intent, 'request-speech');
  assert.equal(result.conversation.relationshipState.interactionCount, 1);
  assert.equal(result.conversation.relationshipState.affinity, 1);
  assert.equal(result.conversation.conversationRequestId.startsWith('conv-'), true);
});

test('explicit "talk to", "ask about", "tell", and addressed forms all route to conversation', async () => {
  const sess = await session('brackenjaw');
  const talk = sess.act('TALK TO RAGNA');
  assert.equal(talk.kind, 'conversation');
  assert.equal(talk.conversation.intent, 'greeting');

  const ask = sess.act('ask Ragna about the patrol route');
  assert.equal(ask.kind, 'conversation');
  assert.equal(ask.conversation.intent, 'inquiry');

  const tell = sess.act('tell Ragna that I saw the trail marks');
  assert.equal(tell.kind, 'conversation');
  assert.equal(tell.conversation.intent, 'freeform');

  const addressed = sess.act('Ragna, what do you know about the eastern woods?');
  assert.equal(addressed.kind, 'conversation');
  assert.equal(addressed.conversation.intent, 'inquiry');
});

test('conversationIntent classifies remainder text', async () => {
  const sess = await session('brackenjaw');
  assert.equal(sess.conversationIntent('I need to speak to you about the patrol'), 'request-speech');
  assert.equal(sess.conversationIntent('What do you know about the eastern woods'), 'inquiry');
  assert.equal(sess.conversationIntent('hello there'), 'greeting');
  assert.equal(sess.conversationIntent('thank you for the warning'), 'social');
  assert.equal(sess.conversationIntent('the fog is moving fast'), 'freeform');
  assert.equal(sess.conversationIntent(''), 'greeting');
});

test('NPC referenced only in Place description but not canonically present is NOT summoned', async () => {
  const sess = await session('hollowmere');
  const result = sess.act('talk to Tamsin, hello');
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'npc-not-present');
  assert.equal(result.referencedNPC.name, 'Tamsin');
  assert.equal(result.currentPlace.name, 'Hollowmere');
  const snap = sess.snapshot();
  assert.equal(snap.state.relationships['npc-tamsin'], undefined);
  assert.deepEqual(snap.presentNPCs.map((n) => n.name), ['Jorah']);
});

test('NPC named only in description text (never loaded as canonical record) causes no state change', async () => {
  const sess = await session('old-road');
  const before = sess.snapshot().state.currentPlaceId;
  const beforeNPCs = sess.snapshot().presentNPCs.length;
  const result = sess.act('talk to Kael');
  assert.equal(result.kind, 'unresolved');
  assert.equal(sess.snapshot().state.currentPlaceId, before);
  assert.equal(sess.snapshot().presentNPCs.length, beforeNPCs);
  assert.equal(sess.snapshot().relationships['npc-kael'], undefined);
});

test('private relationship state accumulates across conversations', async () => {
  const sess = await session('brackenjaw');
  sess.act('Ragna, hello');
  sess.act('Ragna, what do you know about the woods?');
  const snap = sess.snapshot();
  const rel = snap.relationships['npc-ragna'];
  assert.equal(rel.interactionCount, 2);
  assert.equal(rel.affinity, 2);
  assert.equal(rel.lastContactTurn, 2);
  assert.equal(rel.interactions.length, 2);
});

test('save state preserves relationships and restores them for continued conversation', async () => {
  const first = await session('brackenjaw');
  first.act('Ragna, hello there');
  assert.equal(first.snapshot().relationships['npc-ragna'].interactionCount, 1);
  const saved = first.exportState();

  const second = new WorldSession({ adapter, worldId: 'world-bitterroot', playerId: 'player-1', instanceId: 'inst-1' });
  await second.loadWorld();
  second.restoreState(saved);
  assert.equal(second.snapshot().currentPlace.name, 'Brackenjaw Ranger Station');
  assert.equal(second.snapshot().relationships['npc-ragna'].interactionCount, 1);
  const after = second.act('Ragna, what is the patrol route?');
  assert.equal(after.kind, 'conversation');
  assert.equal(second.snapshot().relationships['npc-ragna'].interactionCount, 2);
});

test('FabulaRuntime emits conversation.requested with structured context', async () => {
  const runtime = new FabulaRuntime({
    worldId: 'world-bitterroot',
    playerId: 'player-1',
    instanceId: 'inst-1',
    worldAdapter: adapter,
    canonMode: 'clean',
  });
  await runtime.loadWorld();
  runtime.startAt('brackenjaw');

  const received = [];
  runtime.events.on('conversation.requested', (envelope) => received.push(envelope.payload));

  const result = runtime.act('Ragna, I need to speak to you about tomorrow\'s patrol.');
  assert.equal(result.kind, 'conversation');
  assert.equal(received.length, 1);
  assert.equal(received[0].referencedNPC.name, 'Ragna Holt');
  assert.equal(received[0].intent, 'request-speech');
  assert.equal(received[0].presence, 'present');
  assert.equal(received[0].place.name, 'Brackenjaw Ranger Station');
  assert.equal(received[0].conversationRequestId.startsWith('conv-'), true);
});
