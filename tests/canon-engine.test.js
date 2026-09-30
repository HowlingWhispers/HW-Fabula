import test from 'node:test';
import assert from 'node:assert/strict';
import { CanonEngine } from '../src/canon/canon-engine.js';

function fixture(policy = {}) {
  let n = 0;
  const now = () => new Date('2026-09-30T12:00:00.000Z');
  const idFactory = (prefix) => `${prefix}-${++n}`;
  return new CanonEngine({ worldId: 'world-test', policy, now, idFactory });
}

function sampleFact(overrides = {}) {
  return {
    type: 'place',
    title: 'Old Watchpost',
    summary: 'A player discovered and restored an abandoned watchpost.',
    scope: 'local',
    subjectKey: 'watchpost-old',
    ...overrides
  };
}

test('weekly Influence awards stop at the configured cap', () => {
  const engine = fixture({ weeklyInfluenceCap: 50, startingInfluence: 0 });
  const first = engine.awardInfluence({ playerId: 'p1', amount: 35, reason: 'milestone' });
  const second = engine.awardInfluence({ playerId: 'p1', amount: 35, reason: 'exploration' });
  assert.equal(first.awarded, 35);
  assert.equal(second.awarded, 15);
  assert.equal(second.capped, true);
  assert.equal(engine.getWallet('p1').balance, 50);
});

test('proposal spends Influence and approved proposal creates flagged player canon', () => {
  const engine = fixture({ startingInfluence: 500, autoApproveMaxImpact: 0 });
  const fact = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact() });
  const before = engine.getWallet('p1').balance;
  const proposal = engine.createProposal({ factId: fact.id, playerId: 'p1' });
  assert.equal(proposal.targetLayer, 'player-canon');
  assert.ok(engine.getWallet('p1').balance < before);
  const result = engine.reviewProposal({ proposalId: proposal.id, reviewerId: 'owner-1', reviewerRole: 'owner', decision: 'approve' });
  assert.equal(result.proposal.status, 'canonized');
  assert.equal(result.canonFact.revision, 1);
  assert.equal(result.canonFact.canonLayer, 'player-canon');
  assert.equal(result.canonFact.canonical, true);
  assert.equal(engine.getUpdatesSince(0).updates.length, 1);
});

test('private transcript fields never enter proposal public payload', () => {
  const engine = fixture({ startingInfluence: 500, autoApproveMaxImpact: 0 });
  const fact = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i-private', evidenceRefs: ['turn-17'], privateTranscript: 'secret roleplay text', ...sampleFact() });
  const proposal = engine.createProposal({ factId: fact.id, playerId: 'p1' });
  assert.equal('privateTranscript' in proposal.publicPayload, false);
  assert.equal(JSON.stringify(proposal).includes('secret roleplay text'), false);
  assert.deepEqual(proposal.provenance.evidenceRefs, ['turn-17']);
});

test('curators cannot approve proposals above their impact ceiling', () => {
  const engine = fixture({ startingInfluence: 5000, autoApproveMaxImpact: 0, curatorReviewMaxImpact: 100 });
  const fact = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact({ type: 'narrative_beat', scope: 'world', flags: { changesWorldArc: true } }) });
  const proposal = engine.createProposal({ factId: fact.id, playerId: 'p1' });
  assert.throws(() => engine.reviewProposal({ proposalId: proposal.id, reviewerId: 'curator-1', reviewerRole: 'curator', decision: 'approve' }), /not authorized/);
});

test('same-subject destructive mutations surface a canon conflict hint', () => {
  const engine = fixture({ startingInfluence: 5000, autoApproveMaxImpact: 0 });
  const original = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact() });
  const firstProposal = engine.createProposal({ factId: original.id, playerId: 'p1' });
  engine.reviewProposal({ proposalId: firstProposal.id, reviewerId: 'owner', reviewerRole: 'owner', decision: 'approve' });
  const changed = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact({ title: 'Ruins of the Old Watchpost', summary: 'The watchpost was destroyed in a later local event.', flags: { destructive: true, mutatesExistingCanon: true } }) });
  const proposal = engine.createProposal({ factId: changed.id, playerId: 'p1' });
  assert.equal(proposal.conflicts.length, 1);
  assert.equal(proposal.conflicts[0].reason, 'same-subject-mutation');
});

test('world owner policy can disable player-canon tickets completely', () => {
  const engine = fixture({ startingInfluence: 500, acceptPlayerCanonSubmissions: false });
  const fact = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact() });
  assert.throws(() => engine.createProposal({ factId: fact.id, playerId: 'p1' }), /not accepting player-canon submissions/);
});

test('ticket queue limit blocks proposal spam before spending Influence', () => {
  const engine = fixture({ startingInfluence: 5000, autoApproveMaxImpact: 0, maxPendingProposalsPerPlayer: 1 });
  const first = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact({ subjectKey: 'one' }) });
  const second = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact({ title: 'Second place', subjectKey: 'two' }) });
  engine.createProposal({ factId: first.id, playerId: 'p1' });
  const before = engine.getWallet('p1').balance;
  assert.throws(() => engine.createProposal({ factId: second.id, playerId: 'p1' }), /ticket limit reached/);
  assert.equal(engine.getWallet('p1').balance, before);
});

test('community layer is opt-in, Influence-limited, and never increments canon revision', () => {
  const disabled = fixture({ startingInfluence: 500, allowCommunityLayer: false });
  const blockedFact = disabled.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact() });
  assert.throws(() => disabled.publishCommunityFact({ factId: blockedFact.id, playerId: 'p1' }), /community layer disabled/);

  const engine = fixture({ startingInfluence: 500, allowCommunityLayer: true, communityInfluenceMultiplier: 0.5 });
  const fact = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact() });
  const before = engine.getWallet('p1').balance;
  const published = engine.publishCommunityFact({ factId: fact.id, playerId: 'p1' });
  assert.equal(published.canonLayer, 'community');
  assert.equal(published.canonical, false);
  assert.equal(engine.revision, 0);
  assert.equal(engine.communityRevision, 1);
  assert.ok(engine.getWallet('p1').balance < before);
});

test('canon view modes preserve clean authored canon as a filter boundary', () => {
  const engine = fixture({ startingInfluence: 5000, autoApproveMaxImpact: 0, allowCommunityLayer: true });
  const canonFact = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact({ subjectKey: 'canon' }) });
  const proposal = engine.createProposal({ factId: canonFact.id, playerId: 'p1' });
  engine.reviewProposal({ proposalId: proposal.id, reviewerId: 'owner', reviewerRole: 'owner', decision: 'approve' });
  const communityFact = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact({ title: 'Optional shrine', subjectKey: 'community' }) });
  engine.publishCommunityFact({ factId: communityFact.id, playerId: 'p1' });
  assert.deepEqual(engine.listSharedFacts('clean'), []);
  assert.equal(engine.listSharedFacts('player-canon').length, 1);
  assert.equal(engine.listSharedFacts('community').length, 2);
  assert.deepEqual(new Set(engine.listSharedFacts('community').map((fact) => fact.canonLayer)), new Set(['player-canon', 'community']));
});

test('state export/import preserves new layers and imports legacy schema 1', () => {
  const engine = fixture({ startingInfluence: 500, autoApproveMaxImpact: 0, allowCommunityLayer: true });
  const fact = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact() });
  const proposal = engine.createProposal({ factId: fact.id, playerId: 'p1' });
  engine.reviewProposal({ proposalId: proposal.id, reviewerId: 'owner', reviewerRole: 'owner', decision: 'approve' });
  const community = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact({ title: 'Rumor camp', subjectKey: 'rumor' }) });
  engine.publishCommunityFact({ factId: community.id, playerId: 'p1' });

  const copy = fixture();
  copy.importState(engine.exportState());
  assert.equal(copy.revision, 1);
  assert.equal(copy.listCanonFacts()[0].canonLayer, 'player-canon');
  assert.equal(copy.listCommunityFacts()[0].canonLayer, 'community');

  const legacy = engine.exportState();
  legacy.schemaVersion = 1;
  delete legacy.communityFacts;
  delete legacy.communityLog;
  delete legacy.communityRevision;
  const legacyCopy = fixture();
  legacyCopy.importState(legacy);
  assert.equal(legacyCopy.listCanonFacts()[0].canonLayer, 'player-canon');
});
