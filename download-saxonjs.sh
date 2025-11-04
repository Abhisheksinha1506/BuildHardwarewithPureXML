#!/bin/bash

# SaxonJS Browser Runtime Download Helper Script
# This script helps you download SaxonJS2.rt.js manually

echo "=========================================="
echo "SaxonJS Browser Runtime Download Helper"
echo "=========================================="
echo ""
echo "This script will guide you through downloading SaxonJS2.rt.js"
echo ""
echo "Step 1: The file needs to be downloaded manually from:"
echo "   https://www.saxonica.com/download/javascript.xml"
echo ""
echo "Step 2: After downloading and extracting, you'll need to copy"
echo "   SaxonJS2.rt.js to this directory:"
echo "   $(pwd)/lib/"
echo ""

# Check if file already exists
if [ -f "lib/SaxonJS2.rt.js" ]; then
    FILE_SIZE=$(ls -lh lib/SaxonJS2.rt.js | awk '{print $5}')
    echo "✅ SaxonJS2.rt.js already exists! ($FILE_SIZE)"
    echo ""
    read -p "Do you want to verify it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -s "lib/SaxonJS2.rt.js" ]; then
            SIZE_BYTES=$(stat -f%z lib/SaxonJS2.rt.js 2>/dev/null || stat -c%s lib/SaxonJS2.rt.js 2>/dev/null)
            if [ "$SIZE_BYTES" -gt 1000000 ]; then
                echo "✅ File size looks good! (~$(($SIZE_BYTES / 1024 / 1024)) MB)"
                echo "✅ Ready to use!"
            else
                echo "❌ File is too small ($FILE_SIZE). Please download again."
            fi
        fi
    fi
else
    echo "❌ SaxonJS2.rt.js not found in lib/ directory"
    echo ""
    echo "To download:"
    echo "1. Visit: https://www.saxonica.com/download/javascript.xml"
    echo "2. Download SaxonJS 2.6 or 2.7 (ZIP file)"
    echo "3. Extract the ZIP"
    echo "4. Copy SaxonJS2.rt.js from extracted folder to:"
    echo "   $(pwd)/lib/"
    echo ""
    echo "Or if you already downloaded it, tell me the path and I can copy it:"
    read -p "Enter path to SaxonJS2.rt.js (or press Enter to skip): " SAXON_PATH
    if [ ! -z "$SAXON_PATH" ] && [ -f "$SAXON_PATH" ]; then
        cp "$SAXON_PATH" lib/SaxonJS2.rt.js
        echo "✅ File copied to lib/SaxonJS2.rt.js"
        ls -lh lib/SaxonJS2.rt.js
    fi
fi

echo ""
echo "After placing the file, refresh your browser!"

