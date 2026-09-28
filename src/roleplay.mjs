import { resolveAction } from './engine.mjs';

/**
 * Minimal pre-alpha roleplay adapter.
 *
 * This intentionally does not pretend to understand arbitrary prose yet.
 * It stores the player's authored turn verbatim, applies a few deterministic
 * heuristics, and creates a structured request that can later be replaced by
 * Speculus/NovelAI intent interpretation without changing Fabula's authority.
 */
export function parseRoleplayTurn(text) {
  const source = String(text ?? '').trim();
  if (!source) {
    return { kind: 'empty', source, dialogue: [], actions: [] };
  }

  const dialogue = [];
  const quotePattern = /["“]([^"”]+)["”]/g;
  let match;
  while ((match = quotePattern.exec(source))) dialogue.push(match[1].trim());

  const lowered = source.toLowerCase();
  const actions = [];

  // Pre-alpha deterministic examples. The important part is the structured
  // boundary; a future interpreter can emit the same action IDs.
  if (/\b(climb|scramble)\b/.test(lowered)) actions.push('climb_muddy_bank');
  if (/\b(sneak|creep|slip past)\b/.test(lowered)) actions.push('sneak_past_warden');
  if (/\b(cross|ford|wade)\b/.test(lowered) && /\b(river|stream|water)\b/.test(lowered)) {
    actions.push('cross_river');
  }

  return {
    kind: actions.length ? (dialogue.length ? 'mixed' : 'action') : (dialogue.length ? 'dialogue' : 'freeform'),
    source,
    dialogue,
    actions: [...new Set(actions)]
  };
}

export function submitRoleplayTurn(state, text, options = {}) {
  const parsed = parseRoleplayTurn(text);
  const next = structuredClone(state);

  if (parsed.kind === 'empty') {
    return { state: next, parsed, receipts: [] };
  }

  next.scene ??= { transcript: [] };
  next.scene.transcript ??= [];
  next.scene.transcript.push({
    id: `turn-${next.scene.transcript.length + 1}`,
    speaker: 'player',
    text: parsed.source,
    worldTime: next.worldTime
  });

  const receipts = [];
  let working = next;
  for (let i = 0; i < parsed.actions.length; i += 1) {
    const result = resolveAction(working, parsed.actions[i], {
      seed: Number(options.seed ?? Date.now()) + i
    });
    working = result.state;
    receipts.push(result.receipt);
  }

  // The narration response is deliberately a placeholder. Fabula records the
  // player's turn and mechanics; Speculus/provider rendering comes later.
  working.scene.transcript.push({
    id: `turn-${working.scene.transcript.length + 1}`,
    speaker: 'fabula',
    text: parsed.actions.length
      ? `Mechanical resolution recorded for: ${parsed.actions.join(', ')}. Narration bridge not connected yet.`
      : 'Turn recorded. No mechanical check was required by the pre-alpha parser.',
    worldTime: working.worldTime,
    system: true
  });

  return { state: working, parsed, receipts };
}
