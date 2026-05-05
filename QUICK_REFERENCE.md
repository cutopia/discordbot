# 🎲 Dice Roll Tool - Quick Reference

## Import
```javascript
import { executeTool, getToolDefinitions } from './tools.js';
```

## Execute a Roll
```javascript
const result = await executeTool('roll_dice', {
  notation: '1d20+5'
});
console.log(result.message);
```

## Available Notations

| Notation | Description |
|----------|-------------|
| `1d20` | Single d20 roll |
| `1d20+5` | d20 with +5 modifier |
| `2d6-3` | Two d6 dice minus 3 |
| `3d8` | Three d8 dice |
| `4d6+3` | Four d6 plus 3 |

## Common Use Cases

### RPG Character Check
```javascript
const result = await executeTool('roll_dice', {
  notation: '1d20+5'
});
// For attack rolls, skill checks, etc.
```

### Damage Roll
```javascript
const damage = await executeTool('roll_dice', {
  notation: '2d8+3'
});
console.log(`Dealt ${damage.details.total} damage!`);
```

### Multiple Rolls
```javascript
for (let i = 0; i < 5; i++) {
  const result = await executeTool('roll_dice', {
    notation: '1d20'
  });
  console.log(`Roll ${i+1}: ${result.details.total}`);
}
```

## Result Structure
```json
{
  "success": true,
  "message": "🎲 **1d20+5**\nRolls: [18] (sum: 18)\nModifier: +5\n**Total: 23**",
  "details": {
    "notation": "1d20+5",
    "numberOfDice": 1,
    "sides": 20,
    "modifier": 5,
    "rolls": [18],
    "sum": 18,
    "total": 23
  }
}
```

## Error Handling
```javascript
try {
  const result = await executeTool('roll_dice', { notation: 'invalid' });
  
  if (!result.success) {
    console.error(`Error: ${result.error}`);
  }
} catch (error) {
  console.error(`Unexpected error: ${error.message}`);
}
```

## LLM Integration
```javascript
const tools = getToolDefinitions();
// Send to LLM for function calling

// When LLM requests tool:
const result = await executeTool(toolName, arguments);
```

## Testing
```bash
npm run test-tools
node examples/llm-tools-example.js
```

## Full Documentation
- `TOOLS.md` - User documentation
- `INTEGRATION_GUIDE.md` - Integration guide
- `TOOLS_IMPLEMENTATION.md` - Implementation details
