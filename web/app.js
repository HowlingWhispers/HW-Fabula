import { submitRoleplayTurn } from '/src/roleplay.mjs';
import { ageInYears, createStateFromWorldPackage, formatWorldTime, normalizeState } from '/src/state.mjs';
import { listCurrencies } from '/src/world.mjs';
import { WORLD_PACKAGES } from '/worlds/registry.mjs';
import { SAVE_SLOTS, loadSlot, saveSlot, slotMetadata } from '/web/save-store.js';

const LEGACY_STORAGE_KEY = 'hw-fabula-prealpha-state-v2';
const world = WORLD_PACKAGES[0];
if (!world) throw new Error('No Fabula world packages are registered.');

let state = loadStartupState();
let lastNarrationRequest = null;
const $ = (id) => document.getElementById(id);

function newState() {
  return createStateFromWorldPackage(world, {
    instanceId: `${world.id}-local-${Date.now()}`
  });
}

function loadStartupState() {
  const autosave = loadSlot(localStorage, world.id, 'autosave');
  if (autosave?.state) return normalizeState(autosave.state, world);

  // One-way import from the roleplay-first 0.0.2 prototype.
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migrated = normalizeState(JSON.parse(legacy), world);
      saveSlot(localStorage, world.id, 'autosave', migrated);
      return migrated;
    }
  } catch {
    // Fall through to a fresh instance.
  }

  const fresh = newState();
  saveSlot(localStorage, world.id, 'autosave', fresh);
  return fresh;
}

function autosave() {
  saveSlot(localStorage, world.id, 'autosave', state);
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

function renderBalances() {
  const currencies = listCurrencies(world);
  const nodes = currencies.map((currency) => {
    const row = document.createElement('div');
    row.className = 'state-row';

    const label = document.createElement('span');
    label.textContent = currency.name;

    const value = document.createElement('strong');
    const amount = state.actor.balances?.[currency.id] ?? 0;
    value.textContent = currency.symbol ? `${currency.symbol}${amount}` : String(amount);

    row.append(label, value);
    return row;
  });

  $('balances').replaceChildren(...nodes);
}

function populateSaveSlots() {
  const select = $('save-slot');
  if (select.options.length) return;

  for (const slot of SAVE_SLOTS.filter((item) => item.id !== 'autosave')) {
    const option = document.createElement('option');
    option.value = slot.id;
    option.textContent = slot.label;
    select.appendChild(option);
  }

  select.value = 'slot1';
}

function renderSaveMetadata() {
  const selected = $('save-slot').value;
  const meta = slotMetadata(localStorage, world.id).find((slot) => slot.id === selected);
  if (!meta?.occupied) {
    $('save-meta').textContent = 'Empty slot';
    return;
  }
  $('save-meta').textContent = `Saved ${new Date(meta.savedAt).toLocaleString()}`;
}

function setStatus(message) {
  $('turn-status').textContent = message;
  $('turn-status').hidden = false;
}

function render() {
  $('world-name').textContent = world.name.toUpperCase();
  $('location').textContent = state.location.name;
  $('location-detail').textContent = state.location.detail ?? '';
  $('world-time').textContent = formatWorldTime(state.clock);
  $('weather').textContent = state.weather.label;
  $('scene-title').textContent = state.location.detail
    ? `${state.location.name} · ${state.location.detail}`
    : state.location.name;
  $('actor-name').textContent = state.actor.name.toUpperCase();
  $('actor-age').textContent = `${ageInYears(state).toFixed(3)} YEARS`;
  $('health').textContent = `${state.actor.health.current} / ${state.actor.health.max}`;
  $('fatigue').textContent = `${state.actor.fatigue} / 10`;
  $('encounter').textContent = state.encounter?.name ?? 'None';
  $('last-result').textContent = state.lastResolution?.classification ?? 'No roll has been required.';
  $('diagnostics').textContent = lastNarrationRequest
    ? JSON.stringify(lastNarrationRequest, null, 2)
    : 'No turn submitted yet.';
  $('world-diagnostics').textContent = JSON.stringify({
    id: world.id,
    name: world.name,
    schemaVersion: world.schemaVersion,
    skills: world.rules?.skills?.map((skill) => skill.id) ?? [],
    actions: Object.keys(world.rules?.actions ?? {}),
    currencies: world.economy?.currencies?.map((currency) => currency.id) ?? []
  }, null, 2);

  renderTranscript();
  renderInventory();
  renderBalances();
  renderSaveMetadata();
}

function submitTurn() {
  const input = $('roleplay-input');
  const text = input.value.trim();
  if (!text) return;

  const result = submitRoleplayTurn(state, world, text, { seed: freshSeed() });
  state = result.state;
  lastNarrationRequest = result.narrationRequest;
  autosave();
  input.value = '';

  if (result.receipts.length) {
    setStatus(`${result.receipts.at(-1).classification} · mechanical result committed before narration`);
  } else {
    setStatus('Turn committed · no mechanical roll required · narrator bridge pending');
  }

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

$('save-slot').addEventListener('change', renderSaveMetadata);

$('save-button').addEventListener('click', () => {
  const slot = $('save-slot').value;
  saveSlot(localStorage, world.id, slot, state);
  setStatus(`Saved current Fabula instance to ${slot}.`);
  renderSaveMetadata();
});

$('load-button').addEventListener('click', () => {
  const slot = $('save-slot').value;
  const payload = loadSlot(localStorage, world.id, slot);
  if (!payload?.state) {
    setStatus('That save slot is empty.');
    return;
  }

  state = normalizeState(payload.state, world);
  lastNarrationRequest = null;
  autosave();
  setStatus(`Loaded ${slot}.`);
  render();
  $('roleplay-input').focus();
});

$('new-button').addEventListener('click', () => {
  state = newState();
  lastNarrationRequest = null;
  autosave();
  setStatus(`Started a new local ${world.name} instance.`);
  render();
  $('roleplay-input').focus();
});

populateSaveSlots();
render();
$('roleplay-input').focus();
