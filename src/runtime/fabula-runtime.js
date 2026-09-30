import { CanonEngine } from '../canon/canon-engine.js';
import { EventBus } from './event-bus.js';
import { WorldSession } from './world-session.js';

export class FabulaRuntime {
  constructor({ worldId, playerId, instanceId, policy, now, idFactory, worldAdapter = null } = {}) {
    this.worldId = worldId;
    this.playerId = playerId;
    this.instanceId = instanceId;
    this.events = new EventBus();
    this.canon = new CanonEngine({ worldId, policy, now, idFactory });
    this.worldSession = worldAdapter ? new WorldSession({ adapter: worldAdapter, worldId, playerId, instanceId, now }) : null;
    this.worldLoaded = false;
  }

  async loadWorld() {
    if (!this.worldSession) throw new Error('No world adapter is configured for this Fabula runtime.');
    const summary = await this.worldSession.loadWorld();
    this.worldLoaded = true;
    this.events.emit('world.loaded', summary);
    return summary;
  }

  startAt(placeId) {
    if (!this.worldLoaded || !this.worldSession) throw new Error('Load the Orbis world before choosing a starting place.');
    const result = this.worldSession.startAt(placeId);
    this.events.emit('instance.started', {
      worldId: this.worldId,
      instanceId: this.instanceId,
      place: result.currentPlace,
    });
    return result;
  }

  act(input) {
    if (!this.worldLoaded || !this.worldSession) throw new Error('Load and start the Orbis world before acting.');
    this.events.emit('turn.started', { input });
    const result = this.worldSession.act(input);
    this.events.emit('action.resolved', result);

    let influence = null;
    if (result.ok && result.kind === 'move' && result.firstVisit) {
      influence = this.awardInfluence(5, 'first visit to a canonical place', `visit:${result.currentPlace.id}`);
    }

    const output = { ...result, influence };
    this.events.emit('turn.completed', output);
    return output;
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

  exportSave() {
    return {
      schemaVersion: 2,
      savedAt: new Date().toISOString(),
      worldId: this.worldId,
      playerId: this.playerId,
      instanceId: this.instanceId,
      adventure: this.worldLoaded && this.worldSession ? this.worldSession.exportState() : null,
      canon: this.canon.exportState(),
    };
  }

  async importSave(save) {
    if (!save || typeof save !== 'object') throw new Error('Fabula save is invalid.');
    if (save.worldId !== this.worldId) throw new Error('Fabula save belongs to a different world.');
    if (save.canon) this.canon.importState(save.canon);
    if (this.worldSession) {
      if (!this.worldLoaded) await this.loadWorld();
      if (save.adventure) this.worldSession.restoreState(save.adventure);
    }
    this.events.emit('save.restored', { worldId: this.worldId, instanceId: this.instanceId });
    return this.snapshot();
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
      revision: this.canon.revision,
      adventure: this.worldLoaded && this.worldSession ? this.worldSession.snapshot() : null,
    };
  }
}
