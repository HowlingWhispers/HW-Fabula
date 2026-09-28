import { createRng, randomInt } from './random.mjs';

const EMPTY = Object.freeze({ success: 0, advantage: 0, majorPositive: 0, majorNegative: 0 });

const DICE = Object.freeze({
  ability: [
    {},
    { success: 1 },
    { success: 1 },
    { success: 2 },
    { advantage: 1 },
    { advantage: 1 },
    { success: 1, advantage: 1 },
    { success: 1, majorPositive: 1 }
  ],
  difficulty: [
    {},
    { success: -1 },
    { success: -1 },
    { success: -2 },
    { advantage: -1 },
    { advantage: -1 },
    { success: -1, advantage: -1 },
    { success: -1, majorNegative: 1 }
  ],
  boost: [
    {},
    {},
    { success: 1 },
    { advantage: 1 },
    { success: 1, advantage: 1 },
    { advantage: 2 }
  ],
  setback: [
    {},
    {},
    { success: -1 },
    { advantage: -1 },
    { success: -1, advantage: -1 },
    { advantage: -2 }
  ]
});

function normalizeFace(face = EMPTY) {
  return {
    success: face.success ?? 0,
    advantage: face.advantage ?? 0,
    majorPositive: face.majorPositive ?? 0,
    majorNegative: face.majorNegative ?? 0
  };
}

function rollDie(kind, rng) {
  const faces = DICE[kind];
  if (!faces) throw new Error(`Unknown die kind: ${kind}`);
  const faceIndex = randomInt(rng, faces.length);
  return { kind, faceIndex, ...normalizeFace(faces[faceIndex]) };
}

export function rollNarrativePool(pool, seed) {
  const rng = createRng(seed);
  const rolled = [];
  const normalizedPool = {
    ability: Math.max(0, Math.trunc(pool.ability ?? 0)),
    difficulty: Math.max(0, Math.trunc(pool.difficulty ?? 0)),
    boost: Math.max(0, Math.trunc(pool.boost ?? 0)),
    setback: Math.max(0, Math.trunc(pool.setback ?? 0))
  };

  for (const [kind, count] of Object.entries(normalizedPool)) {
    for (let i = 0; i < count; i += 1) rolled.push(rollDie(kind, rng));
  }

  const totals = rolled.reduce((acc, die) => {
    acc.success += die.success;
    acc.advantage += die.advantage;
    acc.majorPositive += die.majorPositive;
    acc.majorNegative += die.majorNegative;
    return acc;
  }, { success: 0, advantage: 0, majorPositive: 0, majorNegative: 0 });

  return {
    seed: Number(seed) >>> 0,
    pool: normalizedPool,
    dice: rolled,
    totals,
    outcome: {
      success: totals.success > 0,
      advantage: Math.max(0, totals.advantage),
      threat: Math.max(0, -totals.advantage),
      majorPositive: totals.majorPositive,
      majorNegative: totals.majorNegative
    }
  };
}
