import { submitRoleplayTurn } from '/src/roleplay.mjs';
import { ageInYears, createInitialState, formatWorldTime, normalizeState } from '/src/state.mjs';

const STORAGE_KEY = 'hw-fabula-prealpha-state-v2';
let state = loadState();
let lastNarrationRequest = null;
const $ = (id) => document.getElementById(id);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeState(raw ? JSON.parse(raw) : createInitialState());
  } catch {
    return createInitialState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function freshSeed() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] || 1;
}

function speakerClass(speaker) {
  if (speaker === 'player') return 'player';
  if (speaker === 'narrator') return 'narrator';
  return 'npc';
}

function renderTranscript() {
  const entries = state.scene?.transcript ?? [];
  const nodes = entries.map((entry) => {
    const article = document.createElement('article');
    article.className = `turn ${speakerClass(entry.speaker)}`;

    const who = entry.speaker === 'player' ? state.actor.name : entry.speaker;
    const label = document.createElement('div');
    label.className = 'speaker';
    label.textContent = who;

    const body = document.createElement('div');
    body.className = 'turn-text';
    body.textContent = entry.text;

    article.append(label, body);

    if (entry.receiptId) {
      const receipt = document.createElement('div');
      receipt.className = 'inline-receipt';
      receipt.textContent = state.lastResolution?.id === entry.receiptId
        ? state.lastResolution.classification
        : 'MECHANICAL RESULT';
      article.append(receipt);
    }

    return article;
  });

  $('transcript').replaceChildren(...nodes);
  $('transcript').scrollTop = $('transcript').scrollHeight;
}

function renderInventory() {
  const nodes = state.actor.inventory.map((item) => {
    const row = document.createElement('div');
    row.className = 'inventory-item';

    const name = document.createElement('strong');
    name.textContent = item.name;

    const detail = document.createElement('span');
    detail.textContent = item.durability == null
      ? `x${item.quantity}`
      : `x${item.quantity} · ${item.durability}%`;

    row.append(name, detail);
    return row;
  });

  $('inventory').replaceChildren(...nodes);
}

function render() {
  $('location').textContent = state.location.name;
  $('location-detail').textContent = state.location.detail;
  $('world-time').textContent = formatWorldTime(state.clock);
  $('weather').textContent = state.weather.label;
  $('scene-title').textContent = `${state.location.name} · ${state.location.detail}`;
  $('actor-name').textContent = state.actor.name.toUpperCase();
  $('actor-age').textContent = `${ageInYears(state).toFixed(3)} YEARS`;
  $('health').textContent = `${state.actor.health.current} / ${state.actor.health.max}`;
  $('fatigue').textContent = `${state.actor.fatigue} / 10`;
  $('coin').textContent = state.actor.coin;
  $('encounter').textContent = state.encounter?.name ?? 'None';
  $('last-result').textContent = state.lastResolution?.classification ?? 'No roll has been required.';
  $('diagnostics').textContent = lastNarrationRequest
    ? JSON.stringify(lastNarrationRequest, null, 2)
    : 'No turn submitted yet.';

  renderTranscript();
  renderInventory();
}

function submitTurn() {
  const input = $('roleplay-input');
  const text = input.value.trim();
  if (!text) return;

  const result = submitRoleplayTurn(state, text, { seed: freshSeed() });
  state = result.state;
  lastNarrationRequest = result.narrationRequest;
  saveState();
  input.value = '';

  const status = $('turn-status');
  if (result.receipts.length) {
    status.textContent = `${result.receipts.at(-1).classification} · mechanical result committed before narration`;
  } else {
    status.textContent = 'Turn committed · no mechanical roll required · narrator bridge pending';
  }
  status.hidden = false;

  render();
  input.focus();
}

$('composer').addEventListener('submit', (event) => {
  event.preventDefault();
  submitTurn();
});

$('roleplay-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    submitTurn();
  }
});

for (const button of document.querySelectorAll('.tab')) {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item === button));
    document.querySelectorAll('.tab-page').forEach((page) => page.classList.remove('active'));
    $(`tab-${button.dataset.tab}`).classList.add('active');
  });
}

$('reset-button').addEventListener('click', () => {
  state = createInitialState();
  lastNarrationRequest = null;
  saveState();
  $('turn-status').hidden = true;
  render();
  $('roleplay-input').focus();
});

render();
$('roleplay-input').focus();
