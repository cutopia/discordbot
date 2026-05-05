/**
 * Dice rolling utility module
 * Supports dice notation like 1d20+5, 2d6-3, 3d8, etc.
 */

import { enableSeededRandom, getSeed } from './seeded-random.js';

// Enable seeded random on module load so it's active for all dice operations
enableSeededRandom();

/**
 * Parse dice notation string (e.g., "1d20+5", "2d6-3", "4d6dl1", "5dh2")
 * Supports:
 * - Basic: 1d20, 2d6
 * - With modifier: 1d20+5, 2d6-3
 * - Drop lowest: 4d6dl1 (drop lowest 1), 5d6dl2 (drop lowest 2)
 * - Drop highest: 5dh1 (drop highest 1), 6dh2 (drop highest 2)
 * @param {string} notation - Dice notation string
 * @returns {object|null} Parsed dice configuration or null if invalid
 */
export function parseDiceNotation(notation) {
  // Regex to match dice notation with optional drop operations (case-insensitive for dl/dh)
  // Format: NdS[+/-M][dlH|dhH] where N=dice count, S=sides, M=modifier, H=how many to drop
  const regex = /^(\d+)d(\d+)([+\-]\d+)?(dl\d+|dh\d+)?$/i;
  const match = notation.match(regex);
  
  if (!match) {
    return null;
  }
  
  const numberOfDice = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;
  
  // Parse drop operations (dl = drop lowest, dh = drop highest)
  let dropLowest = 0;
  let dropHighest = 0;
  
  if (match[4]) {
    if (match[4].startsWith('dl')) {
      dropLowest = parseInt(match[4].substring(2), 10);
    } else if (match[4].startsWith('dh')) {
      dropHighest = parseInt(match[4].substring(2), 10);
    }
  }
  
  // Validate reasonable limits
  if (numberOfDice < 1 || numberOfDice > 100) {
    return { error: 'Number of dice must be between 1 and 100' };
  }
  if (sides < 2 || sides > 1000) {
    return { error: 'Number of sides must be between 2 and 1000' };
  }
  if (dropLowest + dropHighest >= numberOfDice) {
    return { error: 'Cannot drop more dice than rolled' };
  }
  
  return {
    numberOfDice,
    sides,
    modifier,
    dropLowest,
    dropHighest
  };
}

/**
 * Roll dice and calculate result with optional drop operations
 * @param {number} numberOfDice - Number of dice to roll
 * @param {number} sides - Number of sides on each die
 * @param {object} options - Additional options for drop operations
 * @param {number} [options.dropLowest=0] - Number of lowest rolls to drop
 * @param {number} [options.dropHighest=0] - Number of highest rolls to drop
 * @returns {object} Roll results including individual rolls, dropped values, and total
 */
export function rollDice(numberOfDice, sides, options = {}) {
  const { dropLowest = 0, dropHighest = 0 } = options;
  
  // Generate all dice rolls
  const rolls = [];
  
  for (let i = 0; i < numberOfDice; i++) {
    // Generate random number between 1 and sides (inclusive)
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
  }
  
  // Sort rolls to identify which to drop
  const sortedRolls = [...rolls].sort((a, b) => a - b);
  
  // Calculate which rolls to keep
  let keptRolls = sortedRolls;
  let droppedLowest = [];
  let droppedHighest = [];
  
  if (dropLowest > 0 && dropLowest < rolls.length) {
    droppedLowest = sortedRolls.slice(0, dropLowest);
    keptRolls = sortedRolls.slice(dropLowest);
  }
  
  if (dropHighest > 0 && dropHighest < rolls.length) {
    const remainingCount = keptRolls.length;
    if (dropHighest < remainingCount) {
      droppedHighest = keptRolls.slice(remainingCount - dropHighest);
      keptRolls = keptRolls.slice(0, remainingCount - dropHighest);
    }
  }
  
  // Calculate sum of kept rolls
  const sum = keptRolls.reduce((acc, roll) => acc + roll, 0);
  
  return {
    rolls,
    sortedRolls,
    keptRolls,
    droppedLowest,
    droppedHighest,
    sum,
    min: keptRolls.length > 0 ? keptRolls.length : 0,
    max: keptRolls.length * sides
  };
}

/**
 * Process dice notation and return formatted result
 * @param {string} notation - Dice notation string (e.g., "1d20+5", "4d6dl1")
 * @returns {object} Result object with success status, message, and details
 */
export function processDiceRoll(notation) {
  // Parse the notation
  const parsed = parseDiceNotation(notation);
  
  if (!parsed) {
    return {
      success: false,
      error: 'Invalid dice notation. Use format like "1d20+5", "2d6-3", "4d6dl1", or "5dh2"'
    };
  }
  
  if (parsed.error) {
    return {
      success: false,
      error: parsed.error
    };
  }
  
  // Roll the dice with drop operations
  const rollResult = rollDice(
    parsed.numberOfDice, 
    parsed.sides,
    {
      dropLowest: parsed.dropLowest,
      dropHighest: parsed.dropHighest
    }
  );
  
  // Calculate total with modifier
  const total = rollResult.sum + parsed.modifier;
  
  // Build formatted message
  let message = `🎲 **${notation}**\n`;
  
  // Show all rolls if no drops, otherwise show what was kept
  if (parsed.dropLowest === 0 && parsed.dropHighest === 0) {
    const rollsString = rollResult.rolls.join(', ');
    message += `Rolls: [${rollsString}] (sum: ${rollResult.sum})\n`;
  } else {
    // Show all rolls, dropped values, and kept rolls
    const allRolls = rollResult.sortedRolls.join(', ');
    let dropInfo = '';
    
    if (parsed.dropLowest > 0) {
      dropInfo += `Dropped lowest: [${rollResult.droppedLowest.join(', ')}]`;
    }
    if (parsed.dropHighest > 0) {
      if (dropInfo) dropInfo += ', ';
      dropInfo += `Dropped highest: [${rollResult.droppedHighest.join(', ')}]`;
    }
    
    message += `All rolls: [${allRolls}]\n`;
    if (dropInfo) message += `${dropInfo}\n`;
    message += `Kept rolls: [${rollResult.keptRolls.join(', ')}] (sum: ${rollResult.sum})\n`;
  }
  
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
      dropLowest: parsed.dropLowest,
      dropHighest: parsed.dropHighest,
      allRolls: rollResult.sortedRolls,
      keptRolls: rollResult.keptRolls,
      droppedLowest: rollResult.droppedLowest,
      droppedHighest: rollResult.droppedHighest,
      sum: rollResult.sum,
      total,
      
      // Backward compatibility aliases
      rolls: rollResult.rolls, // Original order of rolls
      sortedRolls: rollResult.sortedRolls
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
