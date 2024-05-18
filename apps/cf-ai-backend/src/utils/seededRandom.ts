import { MersenneTwister19937, integer } from "random-js";

function hashString(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

export function seededRandom(seed: string) {
  const seedHash = hashString(seed);
  const engine = MersenneTwister19937.seed(seedHash);
  return () =>
    integer(0, Number.MAX_SAFE_INTEGER)(engine) / Number.MAX_SAFE_INTEGER;
}
