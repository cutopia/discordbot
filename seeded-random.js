/**
 * Seeded Random Number Generator
 * Provides a seeded RNG that can be logged for reproducibility tracking
 */

// Generate a random seed on startup (will be different each run)
const INITIAL_SEED = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

/**
 * Get the current seed being used by the RNG
 * @returns {number} The current seed value
 */
export function getSeed() {
  return INITIAL_SEED;
}

/**
 * Simple Linear Congruential Generator (LCG)
 * Uses parameters from Numerical Recipes
 * @param {number} seed - Current seed value
 * @returns {object} Object containing next seed and random number [0, 1)
 */
function lcg(seed) {
  // Parameters from Numerical Recipes
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  
  const nextSeed = (a * seed + c) % m;
  return {
    nextSeed,
    random: nextSeed / m
  };
}

/**
 * Create a seeded random number generator
 * @param {number} seed - Initial seed value
 * @returns {function} Function that returns random numbers [0, 1)
 */
export function createSeededRNG(seed) {
  let currentSeed = seed;
  
  return function() {
    const result = lcg(currentSeed);
    currentSeed = result.nextSeed;
    return result.random;
  };
}

// Create the global seeded RNG instance
const seededRNG = createSeededRNG(INITIAL_SEED);

/**
 * Replace Math.random with our seeded version
 * This ensures all dice rolls use the seeded RNG
 */
export function enableSeededRandom() {
  // Store original Math.random for reference
  const originalRandom = Math.random.bind(Math);
  
  // Override Math.random to use our seeded RNG
  Math.random = seededRNG;
  
  return originalRandom;
}

/**
 * Restore the original Math.random (useful for testing)
 */
export function restoreOriginalRandom() {
  Math.random = function() {
    return Math.random();
  };
}
