import { resolveAction } from './engine.mjs';
import { normalizeState } from './state.mjs';

/**
 * Pre-alpha roleplay boundary.
 *
 * Fabula preserves the player's authored turn verbatim. It only maps a tiny
 * set of clearly recognized uncertain actions into mechanical action IDs.
 * The interpreter is intentionally conservative until the Speculus/provider
 * bridge can supply structured intent without giving the narrator authority
 * over Fabula's mechanics or canon.
 */
export function parseRoleplayTurn(text) {
  const source = String(text ?? '').trim();
  if (!source) return { kind: 'empty', source, dialogue: [], actions: [] };

  const dialogue = [];
  const quotePattern = /["“]([^"”]+)["”]/g;
  let match;
  while ((match = quotePattern.exec(source))) dialogue.push(match[1].trim());

  const lowered = source.toLowerCase();
  const actions = [];

  if (/\b(climb|scramble)\b/.test(lowered)) actions.push('climb_muddy_bank');
  if (/\b(sneak|creep|move quietly|slip past)\b/.test(lowered)) actions.push('move_quietly');
  if (/\b(push on|keep going|continue|head out|walk|travel|follow the trail|take the trail)\b/.test(lowered)
      && /\b(trail|road|path|walk|travel|going|out)\b/.test(lowered)) {
    actions.push('push_on_trail');
  }

  return {
    kind: actions.length
      ? (dialogue.length ? 'mixed' : 'action')
      : (dialogue.length ? 'dialogue' : 'freeform'),
    source,
    dialogue,
    actions: [...new Set(actions)]
  };
}

function localNarration(receipts) {
  if (!receipts.length) return null;

  const receipt = receipts.at(-1);
  const success = receipt.outcome.success;
  let line;

  if (receipt.action.id === 'climb_muddy_bank') {
    line = success
      ? 'You find enough purchase to make the climb.'
      : 'The wet ground gives under you before you can make the climb.';
  } else if (receipt.action.id === 'move_quietly') {
    line = success
      ? 'You move through the poor visibility without giving away more than the roll allows.'
      : 'Your attempt to move quietly does not hold.';
  } else {
    line = success
      ? 'You make progress along the route.'
      : 'The attempt to push onward stalls.';
  }

  return `${line} [${receipt.classification}]`;
}

export function submitRoleplayTurn(currentState, text, options = {}) {
  const parsed = parseRoleplayTurn(text);
  let state = normalizeState(currentState);

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
    const result = resolveAction(working, parsed.actions[i], (baseSeed + i) >>> 0);
    working = result.state;
    receipts.push(result.receipt);
  }

  // This is only a local mechanical preview. The real prose response belongs
  // to the future Speculus/provider narration bridge.
  const preview = localNarration(receipts);
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
    worldId: working.meta.worldId,
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
