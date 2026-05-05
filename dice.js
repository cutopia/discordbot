/**
 * Dice rolling utility module
 * Supports dice notation like 1d20+5, 2d6-3, 3d8, etc.
 */

import { enableSeededRandom, getSeed } from './seeded-random.js';

// Enable seeded random on module load so it's active for all dice operations
enableSeededRandom();

/**
 * Parse dice notation string (e.g., "1d20+5", "2d6-3", "3d8")
 * @param {string} notation - Dice notation string
 * @returns {object|null} Parsed dice configuration or null if invalid
 */
export function parseDiceNotation(notation) {
  // Regex to match dice notation: number of dice, 'd', sides, optional modifier
  const regex = /^(\d+)d(\d+)([+\-]\d+)?$/;
  const match = notation.toLowerCase().match(regex);
  
  if (!match) {
    return null;
  }
  
  const numberOfDice = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;
  
  // Validate reasonable limits
  if (numberOfDice < 1 || numberOfDice > 100) {
    return { error: 'Number of dice must be between 1 and 100' };
  }
  if (sides < 2 || sides > 1000) {
    return { error: 'Number of sides must be between 2 and 1000' };
  }
  
  return {
    numberOfDice,
    sides,
    modifier
  };
}

/**
 * Roll dice and calculate result
 * @param {number} numberOfDice - Number of dice to roll
 * @param {number} sides - Number of sides on each die
 * @returns {object} Roll results including individual rolls and total
 */
export function rollDice(numberOfDice, sides) {
  const rolls = [];
  let sum = 0;
  
  for (let i = 0; i < numberOfDice; i++) {
    // Generate random number between 1 and sides (inclusive)
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    sum += roll;
  }
  
  return {
    rolls,
    sum,
    min: 1 * numberOfDice,
    max: sides * numberOfDice
  };
}

/**
 * Process dice notation and return formatted result
 * @param {string} notation - Dice notation string (e.g., "1d20+5")
 * @returns {object} Result object with success status, message, and details
 */
export function processDiceRoll(notation) {
  // Parse the notation
  const parsed = parseDiceNotation(notation);
  
  if (!parsed) {
    return {
      success: false,
      error: 'Invalid dice notation. Use format like "1d20+5", "2d6-3", or "3d8"'
    };
  }
  
  if (parsed.error) {
    return {
      success: false,
      error: parsed.error
    };
  }
  
  // Roll the dice
  const rollResult = rollDice(parsed.numberOfDice, parsed.sides);
  
  // Calculate total with modifier
  const total = rollResult.sum + parsed.modifier;
  
  // Format individual rolls as string
  const rollsString = rollResult.rolls.join(', ');
  
  // Build formatted message
  let message = `🎲 **${notation}**\n`;
  message += `Rolls: [${rollsString}] (sum: ${rollResult.sum})\n`;
  
  if (parsed.modifier !== 0) {
    const sign = parsed.modifier > 0 ? '+' : '';
    message += `Modifier: ${sign}${parsed.modifier}\n`;
  }
  
  message += `**Total: ${total}**`;

  return {
    success: true,
    message,
    details: {
      notation,
      numberOfDice: parsed.numberOfDice,
      sides: parsed.sides,
      modifier: parsed.modifier,
      rolls: rollResult.rolls,
      sum: rollResult.sum,
      total
    }
  };
}

/**
 * Generate a random dice roll command example using seeded RNG
 * @returns {string} Example dice notation
 */
export function getRandomDiceExample() {
  const examples = [
    '1d20+5',
    '2d6',
    '3d8-2',
    '1d100',
    '4d6+3',
    '2d12+7'
  ];
  
  // Use Math.random which is now replaced by seededRNG
  return examples[Math.floor(Math.random() * examples.length)];
}

/**
 * Get the seed being used for dice rolls
 * @returns {number} The current seed value
 */
export function getDiceRollSeed() {
  return getSeed();
}
