#!/bin/bash

echo "Testing character generation fixes..."
echo ""

# Test 1: Check if the file has been modified correctly
echo "Test 1: Checking for key modifications in character-generator.js"
if grep -q "buildPreviousChoicesHistory" character-generator.js; then
    echo "✓ buildPreviousChoicesHistory method found"
else
    echo "✗ buildPreviousChoicesHistory method not found"
fi

if grep -q "recordChoice" character-generator.js; then
    echo "✓ recordChoice method found"
else
    echo "✗ recordChoice method not found"
fi

if grep -q "CONSISTENCY CHECK" character-generator.js; then
    echo "✓ Consistency check instructions found in prompts"
else
    echo "✗ Consistency check instructions not found in prompts"
fi

echo ""
echo "Test 2: Checking for specification integration"
if grep -q "includeSpecifications" character-generator.js; then
    echo "✓ includeSpecifications parameter found"
else
    echo "✗ includeSpecifications parameter not found"
fi

if grep -q "USER SPECIFICATIONS TO CONSIDER" character-generator.js; then
    echo "✓ User specifications integration found in context"
else
    echo "✗ User specifications integration not found in context"
fi

echo ""
echo "Test 3: Checking for previous choices history usage"
if grep -q "previousChoicesHistory" character-generator.js; then
    echo "✓ Previous choices history variable found"
else
    echo "✗ Previous choices history variable not found"
fi

echo ""
echo "All tests completed!"
