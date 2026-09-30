import { CanonEngine } from '../canon/canon-engine.js';
import { EventBus } from './event-bus.js';

export class FabulaRuntime {
  constructor({ worldId, playerId, instanceId, policy, now, idFactory } = {}) {
    this.worldId = worldId;
    this.playerId = playerId;
    this.instanceId = instanceId;
    this.events = new EventBus();
    this.canon = new CanonEngine({ worldId, policy, now, idFactory });
  }

  recordLocalFact(fact, { evidenceRefs = [] } = {}) {
    const record = this.canon.recordInstanceFact({
      playerId: this.playerId,
      instanceId: this.instanceId,
      evidenceRefs,
      ...fact
    });
    this.events.emit('instance.fact.recorded', record);
    return record;
  }

  awardInfluence(amount, reason, sourceId = null) {
    const result = this.canon.awardInfluence({
      playerId: this.playerId,
      amount,
      reason,
      sourceId
    });
    this.events.emit('influence.awarded', result);
    return result;
  }

  propose(factId) {
    const proposal = this.canon.createProposal({ factId, playerId: this.playerId });
    this.events.emit('canon.proposal.created', proposal);
    if (proposal.status === 'canonized') {
      this.events.emit('canon.updated', this.canon.getUpdatesSince(Math.max(0, this.canon.revision - 1)));
    }
    return proposal;
  }

  review(proposalId, { reviewerId = 'world-owner', reviewerRole = 'owner', decision, note = '' }) {
    const result = this.canon.reviewProposal({ proposalId, reviewerId, reviewerRole, decision, note });
    this.events.emit('canon.proposal.reviewed', result.proposal);
    if (result.canonFact) this.events.emit('canon.updated', result.canonFact);
    return result;
  }

  snapshot() {
    return {
      worldId: this.worldId,
      playerId: this.playerId,
      instanceId: this.instanceId,
      wallet: this.canon.getWallet(this.playerId),
      localFacts: this.canon.listInstanceFacts(this.playerId),
      proposals: this.canon.listProposals(),
      canonFacts: this.canon.listCanonFacts(),
      revision: this.canon.revision
    };
  }
}
