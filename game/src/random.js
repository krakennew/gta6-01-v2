// Solmar Keys — a small seeded random number generator.
//
// mulberry32: tiny, fast and deterministic. The city, the traffic and the
// pedestrians all draw from seeds derived from one master seed, so the same
// seed always builds the same island and the staged screenshots are stable.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A random float in [min, max).
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// A random integer in [min, max].
export function int(rng, min, max) {
  return Math.floor(range(rng, min, max + 1));
}

// One random element of an array.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// True with probability p (0..1).
export function chance(rng, p) {
  return rng() < p;
}
