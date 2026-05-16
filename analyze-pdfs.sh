#!/bin/bash

# Script to analyze all RPG rulebook PDFs using the new chapter analysis system

echo "=== RPG Rulebook Chapter Analysis ==="
echo ""

# Check if ragsourcebooks directory exists
if [ ! -d "ragsourcebooks" ]; then
    echo "Error: ragsourcebooks/ directory not found"
    exit 1
fi

# Find all PDF files
PDF_FILES=$(ls ragsourcebooks/*.pdf 2>/dev/null)

if [ -z "$PDF_FILES" ]; then
    echo "No PDF files found in ragsourcebooks/"
    exit 1
fi

echo "Found $(echo "$PDF_FILES" | wc -l) PDF file(s):"
echo "$PDF_FILES" | while read -r pdf; do
    echo "  - $(basename $pdf)"
done

echo ""
echo "Starting analysis..."

# Create output directory if it doesn't exist
mkdir -p analysis-results

# Analyze each PDF
for pdf in ragsourcebooks/*.pdf; do
    filename=$(basename "$pdf" .pdf)
    echo ""
    echo "=== Analyzing: $filename ==="
    
    # Run the chapter analysis demo with this PDF
    node examples/chapter-analysis-demo.js
    
    if [ $? -eq 0 ]; then
        echo "✓ Analysis complete for $filename"
    else
        echo "✗ Analysis failed for $filename"
    fi
done

echo ""
echo "=== All analyses complete ==="
echo "Results saved to analysis-results/"
