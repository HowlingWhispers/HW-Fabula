const FACT_TYPES = new Set([
  'place',
  'npc',
  'faction',
  'item',
  'event',
  'lore',
  'narrative_beat',
  'legacy'
]);

const CANON_LAYERS = Object.freeze({
  AUTHORED: 'authored-canon',
  PLAYER: 'player-canon',
  COMMUNITY: 'community'
});

const CANON_VIEW_MODES = new Set(['clean', 'player-canon', 'community']);

const TYPE_WEIGHT = {
  place: 15,
  npc: 10,
  faction: 20,
  item: 10,
  event: 20,
  lore: 15,
  narrative_beat: 25,
  legacy: 20
};

const SCOPE_WEIGHT = {
  personal: 2,
  local: 5,
  place: 15,
  regional: 35,
  world: 80
};

const DEFAULT_POLICY = Object.freeze({
  weeklyInfluenceCap: 200,
  startingInfluence: 120,
  autoApproveMaxImpact: 10,
  curatorReviewMaxImpact: 200,
  refundRejectedProposal: false,
  acceptPlayerCanonSubmissions: true,
  allowCommunityLayer: false,
  maxPendingProposalsPerPlayer: 5,
  maxCommunityFactsPerPlayer: 20,
  communityInfluenceMultiplier: 0.5
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultIdFactory(prefix) {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function assertNonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required`);
  }
}

function normalizeViewMode(mode) {
  const normalized = String(mode ?? 'player-canon').trim().toLowerCase();
  if (!CANON_VIEW_MODES.has(normalized)) throw new Error(`Unsupported canon view mode: ${mode}`);
  return normalized;
}

function sanitizeFact(input) {
  const safe = {
    type: input.type,
    title: String(input.title ?? '').trim(),
    summary: String(input.summary ?? '').trim(),
    scope: input.scope ?? 'local',
    subjectKey: input.subjectKey ? String(input.subjectKey) : null,
    tags: Array.isArray(input.tags) ? input.tags.map(String).slice(0, 12) : [],
    worldDate: input.worldDate ? String(input.worldDate) : null,
    flags: {
      mutatesExistingCanon: Boolean(input.flags?.mutatesExistingCanon),
      destructive: Boolean(input.flags?.destructive),
      createsSettlement: Boolean(input.flags?.createsSettlement),
      changesWorldArc: Boolean(input.flags?.changesWorldArc)
    },
    conflictsWithCanonIds: Array.isArray(input.conflictsWithCanonIds)
      ? input.conflictsWithCanonIds.map(String)
      : []
  };

  if (!FACT_TYPES.has(safe.type)) throw new Error(`Unsupported fact type: ${safe.type}`);
  if (!(safe.scope in SCOPE_WEIGHT)) throw new Error(`Unsupported fact scope: ${safe.scope}`);
  assertNonEmpty(safe.title, 'Fact title');
  assertNonEmpty(safe.summary, 'Fact summary');
  return safe;
}

function publicPayloadFromFact(fact) {
  return {
    type: fact.type,
    title: fact.title,
    summary: fact.summary,
    scope: fact.scope,
    subjectKey: fact.subjectKey,
    tags: fact.tags,
    worldDate: fact.worldDate,
    flags: fact.flags
  };
}

function provenanceFromFact(fact, playerId) {
  return {
    originInstanceId: fact.instanceId,
    originFactId: fact.id,
    proposerId: playerId,
    evidenceRefs: fact.evidenceRefs
  };
}

export class CanonEngine {
  constructor({ worldId, policy = {}, now = () => new Date(), idFactory = defaultIdFactory } = {}) {
    assertNonEmpty(worldId, 'worldId');
    this.worldId = worldId;
    this.policy = { ...DEFAULT_POLICY, ...policy };
    this.now = now;
    this.idFactory = idFactory;
    this.revision = 0;
    this.communityRevision = 0;
    this.wallets = new Map();
    this.instanceFacts = new Map();
    this.proposals = new Map();
    this.canonFacts = new Map();
    this.communityFacts = new Map();
    this.revisionLog = [];
    this.communityLog = [];
  }

  ensureWallet(playerId) {
    assertNonEmpty(playerId, 'playerId');
    if (!this.wallets.has(playerId)) {
      this.wallets.set(playerId, { playerId, balance: this.policy.startingInfluence, earnedByWeek: {} });
    }
    return this.wallets.get(playerId);
  }

  getWallet(playerId) {
    return clone(this.ensureWallet(playerId));
  }

  getPolicy() {
    return clone(this.policy);
  }

  awardInfluence({ playerId, amount, reason, sourceId = null }) {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Influence award must be a positive number');
    assertNonEmpty(reason, 'Influence reason');
    const wallet = this.ensureWallet(playerId);
    const week = isoWeekKey(this.now());
    const alreadyEarned = wallet.earnedByWeek[week] ?? 0;
    const room = Math.max(0, this.policy.weeklyInfluenceCap - alreadyEarned);
    const awarded = Math.min(amount, room);
    wallet.balance += awarded;
    wallet.earnedByWeek[week] = alreadyEarned + awarded;
    return {
      requested: amount,
      awarded,
      capped: awarded < amount,
      weeklyEarned: wallet.earnedByWeek[week],
      weeklyCap: this.policy.weeklyInfluenceCap,
      balance: wallet.balance,
      reason,
      sourceId
    };
  }

  recordInstanceFact({ playerId, instanceId, evidenceRefs = [], ...factInput }) {
    assertNonEmpty(playerId, 'playerId');
    assertNonEmpty(instanceId, 'instanceId');
    const fact = sanitizeFact(factInput);
    const factId = this.idFactory('fact');
    const createdAt = this.now().toISOString();
    const record = {
      id: factId,
      worldId: this.worldId,
      playerId,
      instanceId,
      visibility: 'private',
      status: 'instance',
      createdAt,
      ...fact,
      evidenceRefs: Array.isArray(evidenceRefs) ? evidenceRefs.map(String).slice(0, 20) : []
    };
    this.instanceFacts.set(factId, record);
    return clone(record);
  }

  calculateImpact(factLike) {
    const fact = sanitizeFact(factLike);
    let impact = TYPE_WEIGHT[fact.type] + SCOPE_WEIGHT[fact.scope];
    if (fact.flags.mutatesExistingCanon) impact += 50;
    if (fact.flags.destructive) impact += 60;
    if (fact.flags.createsSettlement) impact += 70;
    if (fact.flags.changesWorldArc) impact += 200;
    return impact;
  }

  calculateInfluenceCost(impact) {
    if (!Number.isFinite(impact) || impact < 0) throw new Error('Impact must be a non-negative number');
    const scaled = impact + Math.pow(impact, 1.18) * 0.55;
    return Math.max(5, Math.ceil(scaled / 5) * 5);
  }

  calculateCommunityCost(impact) {
    const base = this.calculateInfluenceCost(impact);
    const multiplier = Number.isFinite(this.policy.communityInfluenceMultiplier)
      ? Math.max(0, this.policy.communityInfluenceMultiplier)
      : DEFAULT_POLICY.communityInfluenceMultiplier;
    return Math.max(5, Math.ceil((base * multiplier) / 5) * 5);
  }

  findConflicts(factLike) {
    const fact = sanitizeFact(factLike);
    const explicit = new Set(fact.conflictsWithCanonIds);
    const conflicts = [];
    for (const canon of this.canonFacts.values()) {
      const sameSubject = fact.subjectKey && canon.subjectKey && fact.subjectKey === canon.subjectKey;
      if (explicit.has(canon.id) || (sameSubject && (fact.flags.destructive || fact.flags.mutatesExistingCanon))) {
        conflicts.push({
          canonId: canon.id,
          title: canon.title,
          reason: explicit.has(canon.id) ? 'explicit-conflict' : 'same-subject-mutation'
        });
      }
    }
    return conflicts;
  }

  openProposalCount(playerId) {
    return [...this.proposals.values()].filter((proposal) =>
      proposal.proposedBy === playerId && ['pending', 'needs_revision'].includes(proposal.status)).length;
  }

  createProposal({ factId, playerId }) {
    if (!this.policy.acceptPlayerCanonSubmissions) throw new Error('This world is not accepting player-canon submissions.');
    const fact = this.instanceFacts.get(factId);
    if (!fact) throw new Error('Instance fact not found');
    if (fact.playerId !== playerId) throw new Error('Only the owning player can propose this fact');
    if (fact.status !== 'instance') throw new Error('Fact has already entered a shared contribution workflow');
    const openLimit = Math.max(1, Number(this.policy.maxPendingProposalsPerPlayer) || DEFAULT_POLICY.maxPendingProposalsPerPlayer);
    if (this.openProposalCount(playerId) >= openLimit) {
      throw new Error(`Player-canon ticket limit reached (${openLimit} open tickets).`);
    }

    const impact = this.calculateImpact(fact);
    const influenceCost = this.calculateInfluenceCost(impact);
    const wallet = this.ensureWallet(playerId);
    if (wallet.balance < influenceCost) throw new Error(`Not enough Influence: need ${influenceCost}, have ${wallet.balance}`);
    wallet.balance -= influenceCost;
    fact.status = 'proposed';

    const proposalId = this.idFactory('proposal');
    const proposal = {
      id: proposalId,
      worldId: this.worldId,
      factId,
      proposedBy: playerId,
      createdAt: this.now().toISOString(),
      status: 'pending',
      targetLayer: CANON_LAYERS.PLAYER,
      impact,
      influenceCost,
      conflicts: this.findConflicts(fact),
      review: null,
      publicPayload: publicPayloadFromFact(fact),
      provenance: provenanceFromFact(fact, playerId)
    };
    this.proposals.set(proposalId, proposal);

    if (impact <= this.policy.autoApproveMaxImpact && proposal.conflicts.length === 0) {
      return this.reviewProposal({
        proposalId,
        reviewerId: 'fabula:auto-canon',
        reviewerRole: 'system',
        decision: 'approve',
        note: 'Auto-approved by low-impact world policy.'
      }).proposal;
    }
    return clone(proposal);
  }

  publishCommunityFact({ factId, playerId }) {
    if (!this.policy.allowCommunityLayer) throw new Error('This world has the optional community layer disabled.');
    const fact = this.instanceFacts.get(factId);
    if (!fact) throw new Error('Instance fact not found');
    if (fact.playerId !== playerId) throw new Error('Only the owning player can publish this fact');
    if (fact.status !== 'instance') throw new Error('Fact has already entered a shared contribution workflow');
    const limit = Math.max(1, Number(this.policy.maxCommunityFactsPerPlayer) || DEFAULT_POLICY.maxCommunityFactsPerPlayer);
    const used = [...this.communityFacts.values()].filter((entry) => entry.provenance.proposerId === playerId).length;
    if (used >= limit) throw new Error(`Community contribution limit reached (${limit} published facts).`);

    const impact = this.calculateImpact(fact);
    const influenceCost = this.calculateCommunityCost(impact);
    const wallet = this.ensureWallet(playerId);
    if (wallet.balance < influenceCost) throw new Error(`Not enough Influence: need ${influenceCost}, have ${wallet.balance}`);
    wallet.balance -= influenceCost;
    fact.status = 'community';
    this.communityRevision += 1;

    const record = {
      id: this.idFactory('community'),
      worldId: this.worldId,
      communityRevision: this.communityRevision,
      canonLayer: CANON_LAYERS.COMMUNITY,
      canonical: false,
      publishedAt: this.now().toISOString(),
      influenceCost,
      impact,
      ...clone(publicPayloadFromFact(fact)),
      provenance: clone(provenanceFromFact(fact, playerId))
    };
    this.communityFacts.set(record.id, record);
    this.communityLog.push({
      revision: this.communityRevision,
      kind: 'community.added',
      communityId: record.id,
      title: record.title,
      at: record.publishedAt
    });
    return clone(record);
  }

  reviewProposal({ proposalId, reviewerId, reviewerRole, decision, note = '' }) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error('Proposal not found');
    if (proposal.status !== 'pending') throw new Error('Proposal is no longer pending');
    if (!['approve', 'reject', 'needs_revision'].includes(decision)) throw new Error(`Unsupported review decision: ${decision}`);
    const roleAllowed = reviewerRole === 'owner'
      || (reviewerRole === 'curator' && proposal.impact <= this.policy.curatorReviewMaxImpact)
      || (reviewerRole === 'system' && proposal.impact <= this.policy.autoApproveMaxImpact);
    if (!roleAllowed) throw new Error('Reviewer is not authorized for this proposal impact');

    const reviewedAt = this.now().toISOString();
    proposal.review = { reviewerId, reviewerRole, decision, note, reviewedAt };
    if (decision === 'needs_revision') {
      proposal.status = 'needs_revision';
      return { proposal: clone(proposal), canonFact: null };
    }
    if (decision === 'reject') {
      proposal.status = 'rejected';
      const sourceFact = this.instanceFacts.get(proposal.factId);
      if (sourceFact) sourceFact.status = 'instance';
      if (this.policy.refundRejectedProposal) this.ensureWallet(proposal.proposedBy).balance += proposal.influenceCost;
      return { proposal: clone(proposal), canonFact: null };
    }

    proposal.status = 'approved';
    const canonFact = this.#canonize(proposal);
    return { proposal: clone(proposal), canonFact };
  }

  #canonize(proposal) {
    const sourceFact = this.instanceFacts.get(proposal.factId);
    const canonId = this.idFactory('canon');
    this.revision += 1;
    const canonFact = {
      id: canonId,
      worldId: this.worldId,
      revision: this.revision,
      canonLayer: CANON_LAYERS.PLAYER,
      canonical: true,
      canonizedAt: this.now().toISOString(),
      ...clone(proposal.publicPayload),
      provenance: clone(proposal.provenance),
      approvedBy: proposal.review?.reviewerId ?? null
    };
    this.canonFacts.set(canonId, canonFact);
    proposal.canonId = canonId;
    proposal.status = 'canonized';
    if (sourceFact) sourceFact.status = 'canonized';
    this.revisionLog.push({
      revision: this.revision,
      kind: 'player-canon.added',
      canonId,
      title: canonFact.title,
      at: canonFact.canonizedAt
    });
    return clone(canonFact);
  }

  listInstanceFacts(playerId) {
    return [...this.instanceFacts.values()]
      .filter((fact) => fact.playerId === playerId)
      .map(clone)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listProposals() {
    return [...this.proposals.values()].map(clone).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listCanonFacts() {
    return [...this.canonFacts.values()].map((fact) => ({
      canonLayer: CANON_LAYERS.PLAYER,
      canonical: true,
      ...clone(fact)
    })).sort((a, b) => b.revision - a.revision);
  }

  listCommunityFacts() {
    return [...this.communityFacts.values()].map(clone).sort((a, b) => b.communityRevision - a.communityRevision);
  }

  listSharedFacts(mode = 'player-canon') {
    const viewMode = normalizeViewMode(mode);
    if (viewMode === 'clean') return [];
    const playerCanon = this.listCanonFacts();
    if (viewMode === 'player-canon') return playerCanon;
    return [...playerCanon, ...this.listCommunityFacts()];
  }

  getUpdatesSince(revision = 0) {
    return {
      fromRevision: revision,
      toRevision: this.revision,
      updates: this.revisionLog.filter((entry) => entry.revision > revision).map(clone)
    };
  }

  exportState() {
    return {
      schemaVersion: 2,
      worldId: this.worldId,
      policy: clone(this.policy),
      revision: this.revision,
      communityRevision: this.communityRevision,
      wallets: [...this.wallets.entries()],
      instanceFacts: [...this.instanceFacts.entries()],
      proposals: [...this.proposals.entries()],
      canonFacts: [...this.canonFacts.entries()],
      communityFacts: [...this.communityFacts.entries()],
      revisionLog: clone(this.revisionLog),
      communityLog: clone(this.communityLog)
    };
  }

  importState(state) {
    if (!state || ![1, 2].includes(state.schemaVersion)) throw new Error('Unsupported Fabula canon state');
    if (state.worldId !== this.worldId) throw new Error('State belongs to a different world');
    this.policy = { ...DEFAULT_POLICY, ...state.policy };
    this.revision = state.revision ?? 0;
    this.communityRevision = state.communityRevision ?? 0;
    this.wallets = new Map(state.wallets ?? []);
    this.instanceFacts = new Map(state.instanceFacts ?? []);
    this.proposals = new Map((state.proposals ?? []).map(([id, proposal]) => [id, {
      targetLayer: CANON_LAYERS.PLAYER,
      ...proposal
    }]));
    this.canonFacts = new Map((state.canonFacts ?? []).map(([id, fact]) => [id, {
      canonLayer: CANON_LAYERS.PLAYER,
      canonical: true,
      ...fact
    }]));
    this.communityFacts = new Map(state.communityFacts ?? []);
    this.revisionLog = clone(state.revisionLog ?? []);
    this.communityLog = clone(state.communityLog ?? []);
  }
}

export { DEFAULT_POLICY, FACT_TYPES, CANON_LAYERS, CANON_VIEW_MODES, normalizeViewMode };
