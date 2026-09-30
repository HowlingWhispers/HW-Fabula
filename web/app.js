import { OrbisAdapter } from '/src/adapters/orbis-adapter.js';
import { FabulaRuntime } from '/src/runtime/fabula-runtime.js';

const PROFILE_KEY = 'hw-fabula-profile-v1';
const SAVE_KEY = 'hw-fabula-save-v2';
const CANON_PREFS_KEY = 'hw-fabula-canon-preferences-v1';
const DEFAULT_WORLD_NAME = 'Bitterroot';

const adapter = new OrbisAdapter({ baseUrl: '/api/orbis' });
const content = document.querySelector('#content');
const desktopNav = document.querySelector('#desktopNav');
const bottomNav = document.querySelector('#bottomNav');
const revisionBadge = document.querySelector('#revisionBadge');
const sourceBadge = document.querySelector('#sourceBadge');
const toastRegion = document.querySelector('#toastRegion');
const factDialog = document.querySelector('#factDialog');
const factForm = document.querySelector('#factForm');

const routes = [
  { id: 'play', label: 'Play', icon: '◈' },
  { id: 'world', label: 'World', icon: '⌖' },
  { id: 'ledger', label: 'Ledger', icon: '▤' },
  { id: 'canon', label: 'Canon', icon: '✦' },
];

let activeRoute = 'play';
let phase = 'loading';
let runtime = null;
let selectedWorld = null;
let worldChoices = [];
let lastError = '';
let busy = false;

function randomId(prefix) {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${id}`;
}

function loadProfile() {
  try {
    const current = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    if (current?.playerId && current?.instanceId) return current;
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (saved?.playerId && saved?.instanceId) {
      const recovered = { playerId: saved.playerId, instanceId: saved.instanceId };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(recovered));
      return recovered;
    }
  } catch {}
  const profile = { playerId: randomId('player'), instanceId: randomId('instance') };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

const profile = loadProfile();

function readSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); }
  catch { return null; }
}

function readCanonPreferences() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CANON_PREFS_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function canonModePreference(worldId) {
  const mode = readCanonPreferences()[worldId];
  return ['clean', 'player-canon', 'community'].includes(mode) ? mode : null;
}

function storeCanonMode(worldId, mode) {
  const prefs = readCanonPreferences();
  prefs[worldId] = mode;
  localStorage.setItem(CANON_PREFS_KEY, JSON.stringify(prefs));
}

function persist() {
  if (!runtime) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(runtime.exportSave())); }
  catch (error) { console.warn('Fabula could not persist the local save.', error); }
}

function wireRuntimeEvents() {
  runtime.events.on('*', () => {
    if (phase !== 'loading') persist();
    render();
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toast(title, message = '') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<strong>${escapeHtml(title)}</strong>${message ? `<span>${escapeHtml(message)}</span>` : ''}`;
  toastRegion.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

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

function typeLabel(value) {
  return String(value ?? '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status) {
  if (['canonized', 'approved', 'community'].includes(status)) return 'good';
  if (status === 'rejected') return 'bad';
  return 'warn';
}

function placeDepth(place, allPlaces) {
  const byId = new Map(allPlaces.map((item) => [item.id, item]));
  let depth = 0;
  let cursor = place;
  const seen = new Set();
  while (cursor?.parentLocationId && depth < 20 && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    cursor = byId.get(cursor.parentLocationId);
    if (!cursor) break;
    depth += 1;
  }
  return depth;
}

function placePath(place, allPlaces) {
  const byId = new Map(allPlaces.map((item) => [item.id, item]));
  const result = [place.name];
  let cursor = place;
  const seen = new Set([place.id]);
  while (cursor?.parentLocationId && result.length < 20) {
    cursor = byId.get(cursor.parentLocationId);
    if (!cursor || seen.has(cursor.id)) break;
    seen.add(cursor.id);
    result.unshift(cursor.name);
  }
  return result.join(' / ');
}

function positiveNumber(value, fallback) {
  return Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : fallback;
}

function policyFromWorldAsset(worldAsset) {
  const raw = worldAsset?.document?.fabulaPolicy;
  const policy = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    startingInfluence: positiveNumber(policy.startingInfluence, 100),
    weeklyInfluenceCap: positiveNumber(policy.weeklyInfluenceCap, 200),
    autoApproveMaxImpact: positiveNumber(policy.autoApproveMaxImpact, 10),
    curatorReviewMaxImpact: positiveNumber(policy.curatorReviewMaxImpact, 200),
    refundRejectedProposal: policy.refundRejectedProposal === true,
    acceptPlayerCanonSubmissions: policy.acceptPlayerCanonSubmissions !== false,
    allowCommunityLayer: policy.allowCommunityLayer === true,
    maxPendingProposalsPerPlayer: positiveNumber(policy.maxPendingProposalsPerPlayer, 5),
    maxCommunityFactsPerPlayer: positiveNumber(policy.maxCommunityFactsPerPlayer, 20),
    communityInfluenceMultiplier: positiveNumber(policy.communityInfluenceMultiplier, 0.5),
  };
}

async function makeRuntime(worldId) {
  const worldAsset = await adapter.getAsset(worldId);
  const preferredMode = canonModePreference(worldId) ?? 'player-canon';
  runtime = new FabulaRuntime({
    worldId,
    playerId: profile.playerId,
    instanceId: profile.instanceId,
    worldAdapter: adapter,
    canonMode: preferredMode,
    policy: policyFromWorldAsset(worldAsset),
  });
  wireRuntimeEvents();
  await runtime.loadWorld();
  selectedWorld = runtime.snapshot().adventure.world;
  return runtime;
}

async function boot() {
  phase = 'loading';
  lastError = '';
  render();
  try {
    const saved = readSave();
    if (saved?.worldId) {
      const preferredMode = canonModePreference(saved.worldId);
      await makeRuntime(saved.worldId);
      await runtime.importSave(saved);
      if (preferredMode) runtime.setCanonMode(preferredMode);
      phase = runtime.snapshot().adventure?.started ? 'play' : 'start';
      sourceBadge.textContent = 'Orbis live';
      sourceBadge.className = 'status-pill live';
      render();
      return;
    }

    const preferred = await adapter.findWorldByName(DEFAULT_WORLD_NAME);
    if (preferred) {
      await makeRuntime(preferred.id);
      phase = 'start';
      sourceBadge.textContent = 'Orbis live';
      sourceBadge.className = 'status-pill live';
      render();
      return;
    }

    worldChoices = await adapter.listWorlds({ sort: 'name' });
    phase = 'world-choice';
    sourceBadge.textContent = 'Orbis live';
    sourceBadge.className = 'status-pill live';
    render();
  } catch (error) {
    console.error(error);
    lastError = error instanceof Error ? error.message : String(error);
    phase = 'error';
    sourceBadge.textContent = 'Orbis offline';
    sourceBadge.className = 'status-pill';
    render();
  }
}

function loadingPage() {
  return `<section class="card connection-card"><div class="spinner"></div><div><strong>Connecting Fabula to Orbis</strong><div class="muted-copy">Loading canonical worlds and places through the Fabula world adapter.</div></div></section>`;
}

function errorPage() {
  return `<section class="page-head"><div><div class="eyebrow">CONNECTION ERROR</div><h1>Orbis did not answer</h1><p>Fabula leaves the world untouched when its canonical source is unavailable.</p></div></section>
    <section class="card"><div class="notice warn">${escapeHtml(lastError || 'Unknown Orbis connection error.')}</div><div style="margin-top:14px"><button class="button primary" data-retry>Retry connection</button></div></section>`;
}

function worldChoicePage() {
  return `<section class="page-head"><div><div class="eyebrow">ORBIS WORLD</div><h1>Choose a world</h1><p>Bitterroot is the default first live world, but the adapter is generic. Fabula itself is not Bitterroot-specific.</p></div></section>
    <section class="card">
      <form class="search-form" id="worldSearch"><input name="search" placeholder="Search Orbis worlds" autocomplete="off"/><button class="button primary">Search</button></form>
      <div class="world-list">${worldChoices.length ? worldChoices.map((world) => `<button class="world-option" data-world-id="${escapeHtml(world.id)}"><strong>${escapeHtml(world.name)}</strong><span>${escapeHtml(world.summary || 'No summary.')}</span></button>`).join('') : '<div class="empty">No accessible worlds matched.</div>'}</div>
    </section>`;
}

function startPage(snapshot) {
  const adventure = snapshot.adventure;
  const places = adventure.startingPlaces;
  return `<section class="page-head"><div><div class="eyebrow">STARTING ANCHOR</div><h1>Enter ${escapeHtml(adventure.world.name)}</h1><p>Choose the canonical Place where this private Fabula instance physically begins. The selection becomes authoritative state, not prompt decoration.</p></div></section>
    <section class="card hero-world">
      <div class="eyebrow">ORBIS CANON</div><div class="world-title">${escapeHtml(adventure.world.name)}</div>
      <div class="world-summary">${escapeHtml(adventure.world.summary || 'No world summary has been authored.')}</div>
      <div class="stat-row"><div class="stat"><strong>${places.length}</strong><span>startable Places</span></div><div class="stat"><strong>${escapeHtml(adventure.world.sourceType || 'Orbis')}</strong><span>source</span></div></div>
    </section>
    <section class="card">
      <div class="section-title"><h3>Starting Place</h3><small>canonical Orbis Places</small></div>
      <div class="start-list">${places.length ? places.map((place) => {
        const depth = placeDepth(place, places);
        return `<button class="start-option" data-start-place="${escapeHtml(place.id)}" style="padding-left:${14 + Math.min(depth, 4) * 12}px"><strong>${escapeHtml(place.name)}</strong><span>${escapeHtml(place.description || 'No description authored.')}</span><div class="path">${escapeHtml(placePath(place, places))}</div></button>`;
      }).join('') : '<div class="empty">This Orbis world has no canonical Places yet, so Fabula cannot anchor a player instance.</div>'}</div>
    </section>
    <button class="button secondary full" data-open-worlds style="margin-top:12px">Choose another Orbis world</button>`;
}

function historyMarkup(history) {
  if (!history.length) return '<div class="history-empty">Your private turn history starts here.</div>';
  return history.slice(-8).reverse().map((entry) => `<article class="history-entry ${entry.result.ok ? '' : 'bad'}">
    <div class="player-line">Turn ${entry.turn}: ${escapeHtml(entry.input)}</div>
    <div class="result-line">${escapeHtml(entry.result.prose)}</div>
  </article>`).join('');
}

function playPage(snapshot) {
  const adventure = snapshot.adventure;
  const place = adventure.currentPlace;
  const state = adventure.state;
  const breadcrumb = adventure.breadcrumb.map((entry) => `<span>${escapeHtml(entry.name)}</span>`).join('');
  const exits = adventure.exits.map((exit) => `<button class="exit-button" data-go-place="${escapeHtml(exit.name)}"><span><strong>${escapeHtml(exit.name)}</strong><br><small>${exit.id === place.parentLocationId ? 'Leave into parent Place' : 'Enter child Place'}</small></span><span>›</span></button>`).join('');

  return `<section class="page-head"><div><div class="eyebrow">PRIVATE INSTANCE</div><h2>${escapeHtml(adventure.world.name)}</h2><p>Orbis supplies canonical world facts. Fabula owns your mutable private session state.</p></div></section>
    <section class="card scene-card">
      <div class="scene-head"><div class="breadcrumb">${breadcrumb}</div><div class="scene-title">${escapeHtml(place.name)}</div></div>
      <div class="scene-description">${escapeHtml(place.description || 'No canonical description has been authored for this Place yet.')}</div>
      <div class="exits">${exits || '<div class="empty">No parent or child exits are defined for this Place yet.</div>'}</div>
    </section>
    <section class="card">
      <div class="section-title"><h3>Private turn history</h3><small>${state.turnNumber} turns</small></div>
      <div class="history">${historyMarkup(state.history)}</div>
    </section>
    <div class="composer-wrap">
      <div class="quick-row">
        <button class="quick-action" data-command="look">Look</button>
        <button class="quick-action" data-command="inspect">Inspect</button>
        <button class="quick-action" data-command="leave">Leave</button>
        <button class="quick-action" data-command="help">Help</button>
        <button class="quick-action" data-record-fact>Record outcome</button>
      </div>
      <form class="composer" id="actionForm"><input name="action" autocomplete="off" placeholder="What do you do?" aria-label="Fabula action"/><button class="button primary" ${busy ? 'disabled' : ''}>${busy ? '...' : 'Act'}</button></form>
    </div>`;
}

function canonModeButton(snapshot, mode, title, description, disabled = false) {
  const active = snapshot.canonMode === mode;
  return `<button class="action-tile ${active ? 'active' : ''}" data-canon-mode="${mode}" ${disabled ? 'disabled' : ''}><strong>${escapeHtml(title)}</strong><span>${escapeHtml(description)}</span>${active ? '<span class="tag good">Selected</span>' : ''}</button>`;
}

function worldPage(snapshot) {
  const adventure = snapshot.adventure;
  const state = adventure.state;
  const policy = snapshot.canonPolicy;
  return `<section class="page-head"><div><div class="eyebrow">WORLD SOURCE</div><h2>${escapeHtml(adventure.world.name)}</h2><p>This instance reads authored canon from Orbis and keeps player/community history in separate layers.</p></div></section>
    <section class="grid two">
      <div class="card"><h3>Orbis source</h3><p class="muted-copy">${escapeHtml(adventure.world.summary || 'No summary.')}</p><div class="kv"><span>World ID</span><strong>${escapeHtml(adventure.world.id)}</strong><span>Source</span><strong>${escapeHtml(adventure.world.sourceType || 'Orbis')}</strong><span>Places loaded</span><strong>${adventure.world.placeCount}</strong></div></div>
      <div class="card"><h3>Instance state</h3><div class="kv"><span>Current Place</span><strong>${escapeHtml(adventure.currentPlace?.name || 'Not started')}</strong><span>Visited Places</span><strong>${state?.visitedPlaceIds?.length || 0}</strong><span>Turns</span><strong>${state?.turnNumber || 0}</strong><span>Local tick</span><strong>${state?.localTick || 0}</strong></div><p class="muted-copy">Local tick currently counts scene transitions only. It is deliberately not pretending to be canonical travel time.</p></div>
    </section>
    <section class="card">
      <div class="section-title"><h3>Shared history mode</h3><small>per player · per world</small></div>
      <p class="muted-copy">Authored Orbis canon is always present. This setting controls which player-created layers Fabula may add on top.</p>
      <div class="action-grid">
        ${canonModeButton(snapshot, 'clean', 'Clean Canon', 'Authored world canon only.')}
        ${canonModeButton(snapshot, 'player-canon', 'Player Canon', 'Authored canon plus approved player history.')}
        ${canonModeButton(snapshot, 'community', 'Community', policy.allowCommunityLayer ? 'Authored + player canon + optional community content.' : 'This world owner has the community layer disabled.', !policy.allowCommunityLayer)}
      </div>
    </section>
    <section class="card"><div class="notice">Fabula currently trusts only structural parent/child Place adjacency for movement. If Orbis has not supplied a route, the runtime refuses to invent a teleport or journey time.</div></section>
    <section class="card"><div class="section-title"><h3>Save</h3><small>automatic local save</small></div><p class="muted-copy">Your private location, turn history, Influence, Canon Ledger state and shared-history preference are saved automatically in this browser.</p><button class="button danger" data-new-instance>Start a new Fabula instance</button></section>`;
}

function factCard(fact) {
  const impact = runtime.canon.calculateImpact(fact);
  const canonCost = runtime.canon.calculateInfluenceCost(impact);
  const communityCost = runtime.canon.calculateCommunityCost(impact);
  const policy = runtime.canon.getPolicy();
  const actions = [];
  if (fact.status === 'instance' && policy.acceptPlayerCanonSubmissions) {
    actions.push(`<button class="button primary" data-propose="${escapeHtml(fact.id)}">Canon ticket · ${canonCost}</button>`);
  }
  if (fact.status === 'instance' && policy.allowCommunityLayer) {
    actions.push(`<button class="button secondary" data-community="${escapeHtml(fact.id)}">Community · ${communityCost}</button>`);
  }
  if (fact.status === 'instance' && !actions.length) actions.push('<span class="tag warn">Sharing disabled by world owner</span>');
  if (fact.status !== 'instance') actions.push(`<span class="tag ${statusClass(fact.status)}">${escapeHtml(fact.status)}</span>`);
  return `<article class="list-item"><div class="item-top"><div><h4>${escapeHtml(fact.title)}</h4><p>${escapeHtml(fact.summary)}</p></div><div class="item-actions">${actions.join('')}</div></div><div class="meta"><span class="tag">${escapeHtml(typeLabel(fact.type))}</span><span class="tag">${escapeHtml(fact.scope)}</span><span class="tag">Impact ${impact}</span></div></article>`;
}

function ledgerPage(snapshot) {
  const weeklyKey = Object.keys(snapshot.wallet.earnedByWeek).sort().at(-1);
  const earned = weeklyKey ? snapshot.wallet.earnedByWeek[weeklyKey] : 0;
  const policy = snapshot.canonPolicy;
  return `<section class="page-head"><div><div class="eyebrow">PRIVATE → SHARED</div><h2>Canon Ledger</h2><p>Private play facts stay in your instance until you deliberately spend Influence to share them through a world-author-approved lane.</p></div></section>
    <section class="grid two">
      <div class="card"><h3>Influence</h3><div class="stat-row"><div class="stat"><strong>${snapshot.wallet.balance}</strong><span>balance</span></div><div class="stat"><strong>${earned}/${policy.weeklyInfluenceCap}</strong><span>earned this week</span></div></div><p class="muted-copy">Raw message volume earns nothing. Contribution costs scale with impact.</p></div>
      <div class="card"><h3>World contribution policy</h3><div class="kv"><span>Player Canon tickets</span><strong>${policy.acceptPlayerCanonSubmissions ? 'Open' : 'Closed'}</strong><span>Open ticket cap</span><strong>${policy.maxPendingProposalsPerPlayer}</strong><span>Community layer</span><strong>${policy.allowCommunityLayer ? 'Enabled' : 'Disabled'}</strong><span>Community cap</span><strong>${policy.maxCommunityFactsPerPlayer}</strong></div></div>
    </section>
    <section class="card"><h3>Privacy boundary</h3><p class="muted-copy">Shared records carry the durable fact and opaque provenance references. Your private roleplay transcript is not copied into either Player Canon tickets or Community records.</p><button class="button secondary" data-record-fact>Record a private outcome</button></section>
    <section class="card"><div class="section-title"><h3>Instance facts</h3><small>${snapshot.localFacts.length}</small></div><div class="list">${snapshot.localFacts.length ? snapshot.localFacts.map(factCard).join('') : '<div class="empty">No durable private facts have been recorded yet. Exploration state itself remains private runtime state.</div>'}</div></section>`;
}

function proposalCard(proposal) {
  const canReview = proposal.status === 'pending';
  return `<article class="list-item"><div class="item-top"><div><h4>${escapeHtml(proposal.publicPayload.title)}</h4><p>${escapeHtml(proposal.publicPayload.summary)}</p></div><span class="tag ${statusClass(proposal.status)}">${escapeHtml(proposal.status)}</span></div><div class="meta"><span class="tag">Player Canon ticket</span><span class="tag">Impact ${proposal.impact}</span><span class="tag">Cost ${proposal.influenceCost}</span>${proposal.conflicts.length ? `<span class="tag bad">${proposal.conflicts.length} conflict hint</span>` : '<span class="tag good">No conflict hints</span>'}</div>${canReview ? `<div class="item-actions"><button class="button primary" data-review="approve" data-proposal="${escapeHtml(proposal.id)}">Approve locally</button><button class="button secondary" data-review="reject" data-proposal="${escapeHtml(proposal.id)}">Reject</button></div>` : ''}</article>`;
}

function sharedFactCard(fact) {
  const label = fact.canonLayer === 'community' ? 'Community · non-canon' : `Player Canon · r${fact.revision}`;
  return `<article class="list-item"><h4>${escapeHtml(fact.title)}</h4><p>${escapeHtml(fact.summary)}</p><div class="meta"><span class="tag ${fact.canonLayer === 'community' ? 'warn' : 'good'}">${escapeHtml(label)}</span><span class="tag">${escapeHtml(typeLabel(fact.type))}</span></div></article>`;
}

function canonPage(snapshot) {
  return `<section class="page-head"><div><div class="eyebrow">SHARED HISTORY PIPELINE</div><h2>Canon</h2><p>Authored canon, approved Player Canon, and optional Community material remain separate and filterable.</p></div></section>
    <section class="card"><div class="notice warn"><strong>Pre-alpha boundary:</strong> approving or publishing here still changes Fabula's local ledger only. Orbis write-back is not live yet.</div></section>
    <section class="grid two">
      <div class="card"><div class="section-title"><h3>Player Canon tickets</h3><small>${snapshot.proposals.length}</small></div><div class="list">${snapshot.proposals.length ? snapshot.proposals.map(proposalCard).join('') : '<div class="empty">No Player Canon tickets submitted.</div>'}</div></div>
      <div class="card"><div class="section-title"><h3>Your active shared layers</h3><small>${escapeHtml(typeLabel(snapshot.canonMode))}</small></div><p class="muted-copy">Clean Canon filters all player-created shared history. Player Canon adds reviewed contributions. Community adds explicitly non-canon optional records.</p><div class="list">${snapshot.sharedFacts.length ? snapshot.sharedFacts.map(sharedFactCard).join('') : '<div class="empty">No player-created shared records are active in this view.</div>'}</div></div>
    </section>
    <section class="grid two">
      <div class="card"><div class="section-title"><h3>Player Canon records</h3><small>r${snapshot.revision}</small></div><div class="list">${snapshot.canonFacts.length ? snapshot.canonFacts.map(sharedFactCard).join('') : '<div class="empty">No Player Canon record has been approved locally.</div>'}</div></div>
      <div class="card"><div class="section-title"><h3>Community records</h3><small>c${snapshot.communityRevision}</small></div><div class="list">${snapshot.communityFacts.length ? snapshot.communityFacts.map(sharedFactCard).join('') : '<div class="empty">No optional Community records have been published locally.</div>'}</div></div>
    </section>`;
}

function currentSnapshot() {
  try { return runtime?.snapshot() ?? null; }
  catch { return null; }
}

function render() {
  const snapshot = currentSnapshot();
  revisionBadge.textContent = `r${snapshot?.revision ?? 0}`;

  const showNav = phase === 'play' && snapshot?.adventure?.started;
  desktopNav.innerHTML = showNav ? routes.map(navMarkup).join('') : '';
  bottomNav.innerHTML = showNav ? routes.map(navMarkup).join('') : '';
  bottomNav.style.display = showNav ? '' : 'none';

  if (phase === 'loading') content.innerHTML = loadingPage();
  else if (phase === 'error') content.innerHTML = errorPage();
  else if (phase === 'world-choice') content.innerHTML = worldChoicePage();
  else if (phase === 'start') content.innerHTML = startPage(snapshot);
  else if (phase === 'play') {
    if (activeRoute === 'play') content.innerHTML = playPage(snapshot);
    else if (activeRoute === 'world') content.innerHTML = worldPage(snapshot);
    else if (activeRoute === 'ledger') content.innerHTML = ledgerPage(snapshot);
    else content.innerHTML = canonPage(snapshot);
  }

  bindNav();
  bindActions();
}

function bindActions() {
  document.querySelector('[data-retry]')?.addEventListener('click', boot);
  document.querySelector('[data-open-worlds]')?.addEventListener('click', browseWorlds);
  document.querySelector('#worldSearch')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get('search');
    await browseWorlds(String(query || ''));
  });
  document.querySelectorAll('[data-world-id]').forEach((button) => button.addEventListener('click', () => selectWorld(button.dataset.worldId)));
  document.querySelectorAll('[data-start-place]').forEach((button) => button.addEventListener('click', () => startAt(button.dataset.startPlace)));
  document.querySelectorAll('[data-command]').forEach((button) => button.addEventListener('click', () => performAction(button.dataset.command)));
  document.querySelectorAll('[data-go-place]').forEach((button) => button.addEventListener('click', () => performAction(`go to ${button.dataset.goPlace}`)));
  document.querySelector('#actionForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.action;
    const value = input.value.trim();
    if (!value) return;
    input.value = '';
    performAction(value);
  });
  document.querySelectorAll('[data-record-fact]').forEach((button) => button.addEventListener('click', () => factDialog.showModal()));
  document.querySelectorAll('[data-propose]').forEach((button) => button.addEventListener('click', () => proposeFact(button.dataset.propose)));
  document.querySelectorAll('[data-community]').forEach((button) => button.addEventListener('click', () => publishCommunityFact(button.dataset.community)));
  document.querySelectorAll('[data-review]').forEach((button) => button.addEventListener('click', () => reviewProposal(button.dataset.proposal, button.dataset.review)));
  document.querySelectorAll('[data-canon-mode]').forEach((button) => button.addEventListener('click', () => changeCanonMode(button.dataset.canonMode)));
  document.querySelector('[data-new-instance]')?.addEventListener('click', newInstance);
}

async function browseWorlds(search = '') {
  phase = 'loading';
  render();
  try {
    worldChoices = await adapter.listWorlds({ search, sort: 'name' });
    phase = 'world-choice';
    render();
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    phase = 'error';
    render();
  }
}

async function selectWorld(worldId) {
  phase = 'loading'; render();
  try {
    await makeRuntime(worldId);
    phase = 'start';
    render();
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    phase = 'error'; render();
  }
}

function startAt(placeId) {
  try {
    runtime.startAt(placeId);
    phase = 'play';
    activeRoute = 'play';
    persist();
    render();
    toast('Fabula instance started', runtime.snapshot().adventure.currentPlace.name);
  } catch (error) { toast('Could not start', error instanceof Error ? error.message : String(error)); }
}

function performAction(command) {
  if (busy) return;
  busy = true;
  render();
  try {
    const result = runtime.act(command);
    if (result.influence?.awarded) toast('Exploration milestone', `+${result.influence.awarded} Influence for a first canonical visit.`);
    if (!result.ok) toast(typeLabel(result.kind), result.prose);
  } catch (error) {
    toast('Action failed', error instanceof Error ? error.message : String(error));
  } finally {
    busy = false;
    persist();
    render();
  }
}

function changeCanonMode(mode) {
  try {
    runtime.setCanonMode(mode);
    storeCanonMode(runtime.worldId, mode);
    persist();
    render();
    toast('Shared history changed', mode === 'clean' ? 'Clean Canon: authored world history only.' : mode === 'community' ? 'Community layer enabled for this world view.' : 'Approved Player Canon is active for this world view.');
  } catch (error) { toast('Could not change history mode', error instanceof Error ? error.message : String(error)); }
}

function proposeFact(factId) {
  try {
    const proposal = runtime.propose(factId);
    persist(); render();
    toast('Player Canon ticket submitted', `Status: ${proposal.status}. Influence cost ${proposal.influenceCost}.`);
  } catch (error) { toast('Proposal blocked', error instanceof Error ? error.message : String(error)); }
}

function publishCommunityFact(factId) {
  try {
    const contribution = runtime.publishCommunity(factId);
    persist(); render();
    toast('Community record published', `Non-canon · ${contribution.influenceCost} Influence.`);
  } catch (error) { toast('Community publication blocked', error instanceof Error ? error.message : String(error)); }
}

function reviewProposal(proposalId, decision) {
  try {
    runtime.review(proposalId, { reviewerId: 'local-world-owner', reviewerRole: 'owner', decision, note: 'Pre-alpha local review only; no Orbis write-back.' });
    persist(); render();
    toast(decision === 'approve' ? 'Player Canon ticket approved' : 'Player Canon ticket rejected', 'This review remains inside the local Fabula ledger.');
  } catch (error) { toast('Review failed', error instanceof Error ? error.message : String(error)); }
}

function newInstance() {
  if (!confirm('Start a new Fabula instance? This clears the local Fabula save in this browser. Orbis canon and your per-world shared-history preference are not changed.')) return;
  localStorage.removeItem(SAVE_KEY);
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ playerId: profile.playerId, instanceId: randomId('instance') }));
  location.reload();
}

factForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.submitter?.value === 'cancel') { factDialog.close(); return; }
  const data = new FormData(factForm);
  const snapshot = runtime?.snapshot();
  const place = snapshot?.adventure?.currentPlace;
  const turn = snapshot?.adventure?.state?.turnNumber ?? 0;
  try {
    runtime.recordLocalFact({
      type: String(data.get('type')),
      title: String(data.get('title') || ''),
      summary: String(data.get('summary') || ''),
      scope: String(data.get('scope') || 'local'),
      subjectKey: place ? `place:${place.id}:turn:${turn}:${Date.now()}` : `turn:${turn}:${Date.now()}`,
      tags: place ? [place.name] : [],
    }, { evidenceRefs: [`turn:${turn}`, ...(place ? [`place:${place.id}`] : [])] });
    factForm.reset();
    factDialog.close();
    persist(); render();
    toast('Private fact recorded', 'It stays inside this instance until you share it through an enabled world contribution lane.');
  } catch (error) { toast('Could not record fact', error instanceof Error ? error.message : String(error)); }
});

boot();
