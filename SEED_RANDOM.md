# Seeded Random Number Generator

## Overview

The Discord bot now uses a seeded random number generator for all dice rolls. This ensures that while each run of the bot gets a different seed (making rolls unpredictable), we can log and track which seed was used for reproducibility if needed.

## How It Works

1. **Seed Generation**: When the bot starts up, it generates a random 64-bit integer seed using `Math.random()`
2. **Seeded RNG**: A Linear Congruential Generator (LCG) is initialized with this seed
3. **Global Override**: The built-in `Math.random()` function is replaced with our seeded version
4. **Logging**: The seed value is logged to console on startup

## Files Modified

- `seeded-random.js` - New module containing the seeded RNG implementation
- `dice.js` - Updated to use seeded random and export helper functions
- `app.js` - Logs the seed on startup

## Seed Logging

When you start the bot, you'll see output like:

```
🎲 Dice RNG initialized with seed: 1791720092904973
Listening on port 3000
```

This confirms:
- The seeded RNG is active
- The specific seed being used for this run
- That the seed will be different each time (different number each run)

## Technical Details

### Linear Congruential Generator (LCG)
Uses parameters from "Numerical Recipes":
- Multiplier (a): 1664525
- Increment (c): 1013904223  
- Modulus (m): 2^32

### API Functions

**`getDiceRollSeed()`**
- Returns the current seed value being used for dice rolls
- Can be called from anywhere after module initialization

## Testing

Run the dice tests to verify:
```bash
node tests/test-dice.js
```

Each run will show a different seed, confirming the randomness is working correctly.
