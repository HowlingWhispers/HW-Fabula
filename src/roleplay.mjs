import { resolveAction } from './engine.mjs';
import { normalizeState } from './state.mjs';
import { compileWorldPackage } from './world.mjs';

function intentMatches(source, intent) {
  const allMatch = intent.all.length === 0 || intent.all.every((pattern) => pattern.test(source));
  const anyMatch = intent.any.length === 0 || intent.any.some((pattern) => pattern.test(source));
  return allMatch && anyMatch;
}

/**
 * Pre-alpha roleplay boundary.
 *
 * Fabula preserves the player's authored turn verbatim. World packages may
 * declare conservative intent patterns that map prose to mechanical action
 * IDs. Later, Speculus/provider interpretation can emit the same structured
 * action IDs without gaining authority over mechanics or canon.
 */
export function parseRoleplayTurn(worldPackage, text) {
  const world = compileWorldPackage(worldPackage);
  const source = String(text ?? '').trim();
  if (!source) return { kind: 'empty', source, dialogue: [], actions: [] };

  const dialogue = [];
  const quotePattern = /["“]([^"”]+)["”]/g;
  let match;
  while ((match = quotePattern.exec(source))) dialogue.push(match[1].trim());

  const actions = world.compiled.intents
    .filter((intent) => intentMatches(source, intent))
    .map((intent) => intent.actionId)
    .filter((actionId) => Boolean(world.rules.actions[actionId]));

  return {
    kind: actions.length
      ? (dialogue.length ? 'mixed' : 'action')
      : (dialogue.length ? 'dialogue' : 'freeform'),
    source,
    dialogue,
    actions: [...new Set(actions)]
  };
}

function localNarration(worldPackage, receipts) {
  if (!receipts.length) return null;
  const world = compileWorldPackage(worldPackage);
  const receipt = receipts.at(-1);
  const action = world.rules.actions[receipt.action.id];
  const preview = receipt.outcome.success ? action?.preview?.success : action?.preview?.failure;
  if (!preview) return `[${receipt.classification}]`;
  return `${preview} [${receipt.classification}]`;
}

export function submitRoleplayTurn(currentState, worldPackage, text, options = {}) {
  const world = compileWorldPackage(worldPackage);
  const parsed = parseRoleplayTurn(world, text);
  let state = normalizeState(currentState, world);

  if (parsed.kind === 'empty') {
    return { state, parsed, receipts: [], narrationRequest: null };
  }

  state.scene.transcript.push({
    id: `turn-${state.scene.transcript.length + 1}`,
    speaker: 'player',
    text: parsed.source,
    at: state.clock.totalMinutes
  });

  const receipts = [];
  let working = state;
  const baseSeed = Number(options.seed ?? Date.now()) >>> 0;

  for (let i = 0; i < parsed.actions.length; i += 1) {
    const result = resolveAction(working, world, parsed.actions[i], (baseSeed + i) >>> 0);
    working = result.state;
    receipts.push(result.receipt);
  }

  const preview = localNarration(world, receipts);
  if (preview) {
    working.scene.transcript.push({
      id: `turn-${working.scene.transcript.length + 1}`,
      speaker: 'narrator',
      text: preview,
      at: working.clock.totalMinutes,
      mechanical: true,
      receiptId: receipts.at(-1).id
    });
  }

  const narrationRequest = {
    world: {
      id: world.id,
      name: world.name,
      packageSchemaVersion: world.schemaVersion
    },
    instanceId: working.meta.instanceId,
    personaId: working.meta.personaId,
    location: structuredClone(working.location),
    worldTime: structuredClone(working.clock),
    playerTurn: parsed.source,
    parsed,
    receipts: structuredClone(receipts),
    authority: {
      mustRespectReceipts: true,
      mayCreateCanon: false
    }
  };

  return { state: working, parsed, receipts, narrationRequest };
}
