import { FabulaRuntime } from '/src/runtime/fabula-runtime.js';

const STORAGE_KEY = 'hw-fabula-prealpha-canon-v1';
const PLAYER_ID = 'demo-player';
const INSTANCE_ID = 'instance-private-001';
const WORLD_ID = 'demo-shared-world';

const runtime = new FabulaRuntime({
  worldId: WORLD_ID,
  playerId: PLAYER_ID,
  instanceId: INSTANCE_ID,
  policy: {
    startingInfluence: 140,
    weeklyInfluenceCap: 200,
    autoApproveMaxImpact: 10,
    curatorReviewMaxImpact: 200
  }
});

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) runtime.canon.importState(JSON.parse(saved));
} catch (error) {
  console.warn('Could not restore Fabula prototype state', error);
}

const routes = [
  { id: 'play', label: 'Play', icon: '◈' },
  { id: 'ledger', label: 'Ledger', icon: '▤' },
  { id: 'canon', label: 'Canon', icon: '✦' },
  { id: 'review', label: 'Review', icon: '✓' }
];

let activeRoute = 'play';
let selectedFactId = null;

const content = document.querySelector('#content');
const desktopNav = document.querySelector('#desktopNav');
const bottomNav = document.querySelector('#bottomNav');
const revisionBadge = document.querySelector('#revisionBadge');
const dialog = document.querySelector('#proposalDialog');
const proposalPreview = document.querySelector('#proposalPreview');
const proposalTitle = document.querySelector('#proposalTitle');
const confirmProposal = document.querySelector('#confirmProposal');
const toastRegion = document.querySelector('#toastRegion');
const proposalDialog = document.querySelector('#proposalDialog');
const proposalForm = document.querySelector('#proposalForm');

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runtime.canon.exportState()));
}

runtime.events.on('*', () => {
  persist();
  render();
});

function navMarkup(route) {
  return `<button class="nav-button ${route.id === activeRoute ? 'active' : ''}" data-route="${route.id}">
    <span class="nav-icon">${route.icon}</span><span>${route.label}</span>
  </button>`;
}

function bindNav() {
  document.querySelectorAll('[data-route]').forEach((button) => {
    button.addEventListener('click', () => {
      activeRoute = button.dataset.route;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function toast(title, message = '') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<strong>${escapeHtml(title)}</strong>${message ? `<span>${escapeHtml(message)}</span>` : ''}`;
  toastRegion.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function typeLabel(type) {
  return type.replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusClass(status) {
  if (['canonized', 'approved'].includes(status)) return 'good';
  if (['rejected'].includes(status)) return 'bad';
  return 'warn';
}

function factCard(fact, { propose = false } = {}) {
  const impact = runtime.canon.calculateImpact(fact);
  const cost = runtime.canon.calculateInfluenceCost(impact);
  const canPropose = fact.status === 'instance';
  return `<article class="list-item">
    <div class="item-top">
      <div>
        <h4 class="item-title">${escapeHtml(fact.title)}</h4>
        <p class="item-summary">${escapeHtml(fact.summary)}</p>
      </div>
      ${propose ? `<button class="button ${canPropose ? 'primary' : 'secondary'}" data-propose="${fact.id}" ${canPropose ? '' : 'disabled'}>${canPropose ? `Propose · ${cost}` : typeLabel(fact.status)}</button>` : ''}
    </div>
    <div class="meta">
      <span class="tag">${typeLabel(fact.type)}</span>
      <span class="tag">${escapeHtml(fact.scope)}</span>
      <span class="tag ${statusClass(fact.status)}">${escapeHtml(fact.status)}</span>
      <span class="tag">Impact ${impact}</span>
    </div>
  </article>`;
}

function playPage(snapshot) {
  const weeklyKey = Object.keys(snapshot.wallet.earnedByWeek).sort().at(-1);
  const earned = weeklyKey ? snapshot.wallet.earnedByWeek[weeklyKey] : 0;
  const cap = runtime.canon.policy.weeklyInfluenceCap;
  const progress = Math.min(100, (earned / cap) * 100);
  return `
    <section class="page-head">
      <div><div class="eyebrow">PRIVATE INSTANCE</div><h2>Your Fabula</h2><p>Play inside your own instance of the shared world. Local facts remain private unless you choose to submit them to the Canon Ledger.</p></div>
    </section>
    <div class="grid two">
      <section class="card hero-card">
        <div>
          <div class="eyebrow">WORLD</div>
          <h3 class="world-title">Shared World Demo</h3>
          <p>This is a generic Fabula sandbox, not a Bitterroot hard-code. The runtime only knows the stable world ID and authoritative state.</p>
        </div>
        <div class="stat-row">
          <div class="stat"><strong>${snapshot.wallet.balance}</strong><span>Influence</span></div>
          <div class="stat"><strong>${snapshot.localFacts.length}</strong><span>Private facts</span></div>
          <div class="stat"><strong>${snapshot.revision}</strong><span>Canon revision</span></div>
        </div>
      </section>
      <section class="card">
        <div class="section-title"><h3>Influence</h3><small>${earned} / ${cap} this week</small></div>
        <div class="progress"><span style="width:${progress}%"></span></div>
        <p>Earned through validated play milestones. Raw message spam earns nothing.</p>
        <div class="kv"><span>Balance</span><strong>${snapshot.wallet.balance}</strong><span>Weekly cap</span><strong>${cap}</strong><span>Instance</span><strong>private</strong></div>
      </section>
    </div>
    <section class="card" style="margin-top:16px">
      <div class="section-title"><h3>Prototype actions</h3><small>runtime-backed</small></div>
      <div class="action-grid">
        <button class="action-tile" data-action="discover"><strong>Discover a local place</strong><span>Records a private Place fact and earns exploration Influence.</span></button>
        <button class="action-tile" data-action="npc"><strong>Meet a notable NPC</strong><span>Records a private NPC fact without exposing any roleplay transcript.</span></button>
        <button class="action-tile" data-action="base"><strong>Establish a base</strong><span>Creates a higher-impact local Place fact. Canon is not automatic.</span></button>
        <button class="action-tile" data-action="milestone"><strong>Complete a milestone</strong><span>Earn Influence without creating new canon by itself.</span></button>
      </div>
    </section>`;
}

function ledgerPage(snapshot) {
  return `
    <section class="page-head"><div><div class="eyebrow">INSTANCE → CANON</div><h2>Canon Ledger</h2><p>Your durable local facts live here. Spending Influence submits a fact for review. It does not force the world owner to accept it.</p></div></section>
    <section class="card">
      <div class="section-title"><h3>Private facts</h3><small>${snapshot.localFacts.length} recorded</small></div>
      <div class="list">${snapshot.localFacts.length ? snapshot.localFacts.map((f) => factCard(f, { propose: true })).join('') : '<div class="empty">No private facts yet. Create one from Play.</div>'}</div>
    </section>
    <section class="card" style="margin-top:16px">
      <h3>Privacy boundary</h3>
      <p>Fabula submits the durable fact, its scope, provenance IDs, and review metadata. Private roleplay transcripts are not copied into the proposal payload.</p>
      <div class="code-note">private session → structured instance fact → sanitized proposal → review → canon</div>
    </section>`;
}

function canonPage(snapshot) {
  return `
    <section class="page-head"><div><div class="eyebrow">SHARED HISTORY</div><h2>Official Canon</h2><p>Only approved records appear here. Future player instances can receive these through a Canon Adapter / Orbis bridge.</p></div></section>
    <div class="grid two">
      <section class="card">
        <div class="section-title"><h3>Canon facts</h3><small>revision ${snapshot.revision}</small></div>
        <div class="list">${snapshot.canonFacts.length ? snapshot.canonFacts.map((f) => `<article class="list-item"><h4 class="item-title">${escapeHtml(f.title)}</h4><p class="item-summary">${escapeHtml(f.summary)}</p><div class="meta"><span class="tag good">Canon r${f.revision}</span><span class="tag">${typeLabel(f.type)}</span><span class="tag">${escapeHtml(f.scope)}</span></div></article>`).join('') : '<div class="empty">Nothing has been canonized yet.</div>'}</div>
      </section>
      <section class="card">
        <h3>Propagation</h3>
        <p>Canon updates are versioned. An active instance can choose a safe synchronization point instead of mutating reality halfway through a scene.</p>
        <div class="kv"><span>Current revision</span><strong>${snapshot.revision}</strong><span>Shared facts</span><strong>${snapshot.canonFacts.length}</strong><span>Backing store</span><strong>adapter-ready</strong></div>
      </section>
    </div>`;
}

function proposalCard(proposal) {
  const canReview = proposal.status === 'pending';
  return `<article class="list-item">
    <div class="item-top"><div><h4 class="item-title">${escapeHtml(proposal.publicPayload.title)}</h4><p class="item-summary">${escapeHtml(proposal.publicPayload.summary)}</p></div><span class="tag ${statusClass(proposal.status)}">${escapeHtml(proposal.status)}</span></div>
    <div class="meta"><span class="tag">Impact ${proposal.impact}</span><span class="tag">Cost ${proposal.influenceCost}</span>${proposal.conflicts.length ? `<span class="tag bad">${proposal.conflicts.length} conflict</span>` : '<span class="tag good">No conflict hints</span>'}</div>
    ${canReview ? `<div class="action-grid" style="margin-top:12px"><button class="button primary" data-review="approve" data-proposal="${proposal.id}">Approve</button><button class="button secondary" data-review="reject" data-proposal="${proposal.id}">Reject</button></div>` : ''}
  </article>`;
}

function reviewPage(snapshot) {
  return `
    <section class="page-head"><div><div class="eyebrow">OWNER / CURATOR VIEW</div><h2>Review Queue</h2><p>Influence buys the right to propose. World ownership stays sovereign. Curators can be limited by impact while major changes require the owner.</p></div></section>
    <div class="grid two">
      <section class="card"><div class="section-title"><h3>Proposals</h3><small>${snapshot.proposals.length}</small></div><div class="list">${snapshot.proposals.length ? snapshot.proposals.map(proposalCard).join('') : '<div class="empty">No proposals waiting.</div>'}</div></section>
      <section class="card"><h3>Current policy</h3><div class="kv"><span>Auto-approve max impact</span><strong>${runtime.canon.policy.autoApproveMaxImpact}</strong><span>Curator ceiling</span><strong>${runtime.canon.policy.curatorReviewMaxImpact}</strong><span>Weekly Influence cap</span><strong>${runtime.canon.policy.weeklyInfluenceCap}</strong></div><p>These values belong to the world policy and can later come from Orbis.</p></section>
    </div>
    <section class="card" style="margin-top:16px"><h3>Runtime boundary</h3><p>This UI is only a client. Canon calculation, Influence spending, permissions, privacy, revisions, and review rules live in Fabula runtime modules so the interface can be replaced later.</p></section>`;
}

function render() {
  const snapshot = runtime.snapshot();
  revisionBadge.textContent = `r${snapshot.revision}`;
  desktopNav.innerHTML = routes.map(navMarkup).join('');
  bottomNav.innerHTML = routes.map(navMarkup).join('');
  if (activeRoute === 'play') content.innerHTML = playPage(snapshot);
  if (activeRoute === 'ledger') content.innerHTML = ledgerPage(snapshot);
  if (activeRoute === 'canon') content.innerHTML = canonPage(snapshot);
  if (activeRoute === 'review') content.innerHTML = reviewPage(snapshot);
  bindNav();
  bindActions();
}

function bindActions() {
  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => prototypeAction(button.dataset.action)));
  document.querySelectorAll('[data-propose]').forEach((button) => button.addEventListener('click', () => openProposal(button.dataset.propose)));
  document.querySelectorAll('[data-review]').forEach((button) => button.addEventListener('click', () => reviewProposal(button.dataset.proposal, button.dataset.review)));
}

function prototypeAction(action) {
  const nonce = runtime.snapshot().localFacts.length + 1;
  if (action === 'discover') {
    const fact = runtime.recordLocalFact({ type: 'place', title: `Hidden overlook ${nonce}`, summary: 'A previously unrecorded local overlook was reached during exploration.', scope: 'local', subjectKey: `overlook-${nonce}` }, { evidenceRefs: [`event:exploration-${nonce}`] });
    runtime.awardInfluence(18, 'validated exploration discovery', fact.id);
    toast('Discovery recorded', '+18 Influence, fact remains private.');
  }
  if (action === 'npc') {
    const fact = runtime.recordLocalFact({ type: 'npc', title: `Wayfarer ${nonce}`, summary: 'A locally notable traveler became relevant to this player instance.', scope: 'local', subjectKey: `wayfarer-${nonce}` }, { evidenceRefs: [`event:npc-${nonce}`] });
    runtime.awardInfluence(12, 'meaningful roleplay milestone', fact.id);
    toast('NPC fact recorded', 'No transcript was placed in the fact.');
  }
  if (action === 'base') {
    const fact = runtime.recordLocalFact({ type: 'place', title: `Player base ${nonce}`, summary: 'The player established a persistent local base in their private instance.', scope: 'place', subjectKey: `base-${nonce}`, flags: { mutatesExistingCanon: false } }, { evidenceRefs: [`event:base-${nonce}`] });
    runtime.awardInfluence(25, 'base establishment milestone', fact.id);
    toast('Base established locally', 'It is not shared canon until approved.');
  }
  if (action === 'milestone') {
    const result = runtime.awardInfluence(30, 'validated story milestone', `milestone-${Date.now()}`);
    toast('Milestone resolved', `+${result.awarded} Influence${result.capped ? ' (weekly cap reached)' : ''}.`);
  }
}

function openProposal(factId) {
  const fact = runtime.canon.listInstanceFacts(PLAYER_ID).find((entry) => entry.id === factId);
  if (!fact) return;
  selectedFactId = factId;
  const impact = runtime.canon.calculateImpact(fact);
  const cost = runtime.canon.calculateInfluenceCost(impact);
  const wallet = runtime.canon.getWallet(PLAYER_ID);
  proposalTitle.textContent = fact.title;
  proposalPreview.innerHTML = `<div class="list-item"><p class="item-summary">${escapeHtml(fact.summary)}</p><div class="meta"><span class="tag">Impact ${impact}</span><span class="tag">Cost ${cost}</span><span class="tag">Balance ${wallet.balance}</span></div></div><p>This submits a sanitized durable fact. The private roleplay transcript stays private.</p>`;
  confirmProposal.disabled = wallet.balance < cost;
  confirmProposal.textContent = wallet.balance < cost ? `Need ${cost} Influence` : `Spend ${cost} Influence`;
  dialog.showModal();
}

proposalDialog.addEventListener('close', () => { selectedFactId = null; });
proposalForm.addEventListener('submit', (event) => {
  if (event.submitter?.value !== 'submit' || !selectedFactId) return;
  event.preventDefault();
  try {
    const proposal = runtime.propose(selectedFactId);
    dialog.close();
    toast(proposal.status === 'canonized' ? 'Auto-canonized' : 'Proposal submitted', proposal.status === 'canonized' ? 'Low-impact policy approved it.' : 'Awaiting owner or curator review.');
    activeRoute = proposal.status === 'canonized' ? 'canon' : 'review';
    render();
  } catch (error) {
    toast('Could not submit', error.message);
  }
});

function reviewProposal(proposalId, decision) {
  try {
    const result = runtime.review(proposalId, { reviewerId: 'demo-world-owner', reviewerRole: 'owner', decision, note: 'Prototype owner review.' });
    toast(decision === 'approve' ? 'Canon updated' : 'Proposal rejected', result.canonFact ? `Created canon revision ${result.canonFact.revision}.` : 'The private instance fact still exists.');
  } catch (error) {
    toast('Review failed', error.message);
  }
}

render();
