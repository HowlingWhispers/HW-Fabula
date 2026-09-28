export function validateWorldPackage(input) {
  const world = structuredClone(input ?? {});
  const errors = [];

  if (!world.id) errors.push('world.id is required');
  if (!world.name) errors.push('world.name is required');
  if (!world.initialState?.actor?.id) errors.push('world.initialState.actor.id is required');
  if (!world.initialState?.actor?.name) errors.push('world.initialState.actor.name is required');
  if (!world.initialState?.location?.id) errors.push('world.initialState.location.id is required');
  if (!world.initialState?.clock) errors.push('world.initialState.clock is required');

  const actions = world.rules?.actions ?? {};
  for (const [id, action] of Object.entries(actions)) {
    if (action.id && action.id !== id) errors.push(`action key ${id} does not match action.id ${action.id}`);
    if (!action.skill) errors.push(`action ${id} is missing skill`);
    if (!Number.isFinite(action.difficulty)) errors.push(`action ${id} is missing numeric difficulty`);
  }

  if (errors.length) {
    const error = new Error(`Invalid Fabula world package:\n- ${errors.join('\n- ')}`);
    error.details = errors;
    throw error;
  }

  world.schemaVersion ??= 1;
  world.rules ??= {};
  world.rules.actions ??= {};
  world.rules.intents ??= [];
  world.rules.skills ??= [];
  world.economy ??= { currencies: [] };
  world.economy.currencies ??= [];

  return world;
}

export function compileWorldPackage(input) {
  const world = validateWorldPackage(input);

  const intents = world.rules.intents.map((intent) => ({
    actionId: intent.actionId,
    all: (intent.all ?? []).map((pattern) => new RegExp(pattern, 'i')),
    any: (intent.any ?? []).map((pattern) => new RegExp(pattern, 'i'))
  }));

  return {
    ...world,
    compiled: { intents }
  };
}

export function findCurrency(world, currencyId) {
  return world.economy?.currencies?.find((currency) => currency.id === currencyId) ?? null;
}

export function listCurrencies(world) {
  return world.economy?.currencies ?? [];
}

export function listWorldActions(world) {
  return Object.values(world.rules?.actions ?? {});
}
