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

test('proposal spends Influence and approved proposal creates a canon revision', () => {
  const engine = fixture({ startingInfluence: 500, autoApproveMaxImpact: 0 });
  const fact = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact() });
  const before = engine.getWallet('p1').balance;
  const proposal = engine.createProposal({ factId: fact.id, playerId: 'p1' });
  assert.ok(engine.getWallet('p1').balance < before);
  const result = engine.reviewProposal({
    proposalId: proposal.id,
    reviewerId: 'owner-1',
    reviewerRole: 'owner',
    decision: 'approve'
  });
  assert.equal(result.proposal.status, 'canonized');
  assert.equal(result.canonFact.revision, 1);
  assert.equal(engine.getUpdatesSince(0).updates.length, 1);
});

test('private transcript fields never enter proposal public payload', () => {
  const engine = fixture({ startingInfluence: 500, autoApproveMaxImpact: 0 });
  const fact = engine.recordInstanceFact({
    playerId: 'p1',
    instanceId: 'i-private',
    evidenceRefs: ['turn-17'],
    privateTranscript: 'secret roleplay text',
    ...sampleFact()
  });
  const proposal = engine.createProposal({ factId: fact.id, playerId: 'p1' });
  assert.equal('privateTranscript' in proposal.publicPayload, false);
  assert.equal(JSON.stringify(proposal).includes('secret roleplay text'), false);
  assert.deepEqual(proposal.provenance.evidenceRefs, ['turn-17']);
});

test('curators cannot approve proposals above their impact ceiling', () => {
  const engine = fixture({ startingInfluence: 5000, autoApproveMaxImpact: 0, curatorReviewMaxImpact: 100 });
  const fact = engine.recordInstanceFact({
    playerId: 'p1',
    instanceId: 'i1',
    ...sampleFact({
      type: 'narrative_beat',
      scope: 'world',
      flags: { changesWorldArc: true }
    })
  });
  const proposal = engine.createProposal({ factId: fact.id, playerId: 'p1' });
  assert.throws(() => engine.reviewProposal({
    proposalId: proposal.id,
    reviewerId: 'curator-1',
    reviewerRole: 'curator',
    decision: 'approve'
  }), /not authorized/);
});

test('same-subject destructive mutations surface a canon conflict hint', () => {
  const engine = fixture({ startingInfluence: 5000, autoApproveMaxImpact: 0 });
  const original = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact() });
  const firstProposal = engine.createProposal({ factId: original.id, playerId: 'p1' });
  engine.reviewProposal({ proposalId: firstProposal.id, reviewerId: 'owner', reviewerRole: 'owner', decision: 'approve' });

  const changed = engine.recordInstanceFact({
    playerId: 'p1',
    instanceId: 'i1',
    ...sampleFact({
      title: 'Ruins of the Old Watchpost',
      summary: 'The watchpost was destroyed in a later local event.',
      flags: { destructive: true, mutatesExistingCanon: true }
    })
  });
  const proposal = engine.createProposal({ factId: changed.id, playerId: 'p1' });
  assert.equal(proposal.conflicts.length, 1);
  assert.equal(proposal.conflicts[0].reason, 'same-subject-mutation');
});

test('state export/import preserves canon data', () => {
  const engine = fixture({ startingInfluence: 500, autoApproveMaxImpact: 0 });
  const fact = engine.recordInstanceFact({ playerId: 'p1', instanceId: 'i1', ...sampleFact() });
  const proposal = engine.createProposal({ factId: fact.id, playerId: 'p1' });
  engine.reviewProposal({ proposalId: proposal.id, reviewerId: 'owner', reviewerRole: 'owner', decision: 'approve' });

  const copy = fixture();
  copy.importState(engine.exportState());
  assert.equal(copy.revision, 1);
  assert.equal(copy.listCanonFacts()[0].title, 'Old Watchpost');
});
