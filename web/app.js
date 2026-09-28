import { listActions, resolveAction } from '/src/engine.mjs';
import { ageInYears, createInitialState, formatWorldTime } from '/src/state.mjs';

const STORAGE_KEY = 'hw-fabula-prealpha-state-v1';
const actions = listActions();
let state = loadState();

const $ = (id) => document.getElementById(id);
const actionSelect = $('action-select');

actions.forEach((action) => {
  const option = document.createElement('option');
  option.value = action.id;
  option.textContent = action.label;
  actionSelect.appendChild(option);
});

actionSelect.addEventListener('change', renderActionDescription);
$('resolve-button').addEventListener('click', resolveSelectedAction);
$('reset-button').addEventListener('click', () => {
  state = createInitialState();
  saveState();
  render();
});
$('diagnostics-button').addEventListener('click', () => {
  $('diagnostics').hidden = !$('diagnostics').hidden;
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : createInitialState();
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

function resolveSelectedAction() {
  const { state: nextState } = resolveAction(state, actionSelect.value, freshSeed());
  state = nextState;
  saveState();
  render();
}

function renderActionDescription() {
  const action = actions.find((item) => item.id === actionSelect.value);
  $('action-description').textContent = action?.description ?? '';
}

function worldTimeFromMinutes(totalMinutes) {
  const day = Math.floor(totalMinutes / 1440);
  const minuteOfDay = totalMinutes % 1440;
  return formatWorldTime({ day, minuteOfDay });
}

function renderInventory() {
  $('inventory').replaceChildren(...state.actor.inventory.map((item) => {
    const row = document.createElement('div');
    row.className = 'inventory-item';
    const durability = item.durability === null ? '' : ` · ${item.durability}%`;
    row.innerHTML = `<span>${item.name}</span><small>x${item.quantity}${durability}</small>`;
    return row;
  }));
}

function renderResolution() {
  const receipt = state.lastResolution;
  $('empty-resolution').hidden = Boolean(receipt);
  $('resolution').hidden = !receipt;
  if (!receipt) return;

  $('classification').textContent = receipt.classification;
  $('receipt-id').textContent = `${receipt.id} · seed ${receipt.seed}`;

  const poolOrder = ['ability', 'difficulty', 'boost', 'setback'];
  $('pool').replaceChildren(...poolOrder.map((kind) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = `${kind.toUpperCase()} ×${receipt.pool[kind]}`;
    return chip;
  }));

  $('reasons').replaceChildren(...receipt.reasons.map((reason) => {
    const row = document.createElement('div');
    row.className = 'reason';
    row.innerHTML = `<span>${reason.source}</span><small>${reason.effect}</small>`;
    return row;
  }));

  const resultEntries = [
    ['NET SUCCESS', receipt.totals.success],
    ['ADVANTAGE', receipt.outcome.advantage],
    ['THREAT', receipt.outcome.threat],
    ['MAJOR + / -', `${receipt.outcome.majorPositive} / ${receipt.outcome.majorNegative}`]
  ];
  $('result-grid').replaceChildren(...resultEntries.map(([label, value]) => {
    const cell = document.createElement('div');
    cell.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    return cell;
  }));

  const mutations = receipt.mutations.length ? receipt.mutations : [{ path: 'state', before: 'unchanged', after: 'unchanged', reason: 'no persistent mutation' }];
  $('mutations').replaceChildren(...mutations.map((mutation) => {
    const row = document.createElement('div');
    row.className = 'mutation';
    row.innerHTML = `<span>${mutation.path}<br><small>${mutation.reason}</small></span><small>${mutation.before} → ${mutation.after}</small>`;
    return row;
  }));

  $('diagnostics').textContent = JSON.stringify(receipt, null, 2);
}

function renderEventLog() {
  const rows = [...state.eventLog].reverse().map((event) => {
    const row = document.createElement('div');
    row.className = 'event';
    row.dataset.type = event.type;
    row.innerHTML = `<small>${worldTimeFromMinutes(event.at)}</small><strong>${event.text}</strong>`;
    return row;
  });
  $('event-log').replaceChildren(...rows);
}

function render() {
  $('world-name').textContent = state.meta.worldName.toUpperCase();
  $('world-time').textContent = formatWorldTime(state.clock);
  $('actor-name').textContent = state.actor.name.toUpperCase();
  $('actor-age').textContent = `${ageInYears(state).toFixed(3)} YEARS`;
  $('health').textContent = `${state.actor.health.current} / ${state.actor.health.max}`;
  $('fatigue').textContent = `${state.actor.fatigue} / 10`;
  $('coin').textContent = state.actor.coin;
  $('next-boost').textContent = state.actor.temporary.nextCheckBoost;
  $('location').textContent = state.location.name;
  $('location-detail').textContent = state.location.detail;
  $('weather').textContent = state.weather.label;
  $('visibility').textContent = state.weather.visibility;
  $('encounter').textContent = state.encounter ? state.encounter.name : 'NONE';

  $('health-bar').style.width = `${(state.actor.health.current / state.actor.health.max) * 100}%`;
  $('fatigue-bar').style.width = `${state.actor.fatigue * 10}%`;

  renderInventory();
  renderResolution();
  renderEventLog();
  renderActionDescription();
}

render();
