export function createRng(seed) {
  let value = Number(seed) >>> 0;
  if (value === 0) value = 0x6d2b79f5;

  return function rng() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng, maxExclusive) {
  return Math.floor(rng() * maxExclusive);
}
