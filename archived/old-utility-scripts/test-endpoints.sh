#!/bin/bash

echo "=== Testing PropMaster Task Management System ==="
echo ""
echo "Deployment URL: https://7qz08gud84b6.space.minimax.io"
echo ""

# Test 1: Check if the website is accessible
echo "1. Testing Website Accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://7qz08gud84b6.space.minimax.io)
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✓ Website is accessible (HTTP $HTTP_CODE)"
else
    echo "   ✗ Website returned HTTP $HTTP_CODE"
fi
echo ""

# Test 2: Check if tasks page route exists
echo "2. Testing Tasks Page Route..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://7qz08gud84b6.space.minimax.io/tasks-maintenance)
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✓ Tasks page route exists (HTTP $HTTP_CODE)"
else
    echo "   ✗ Tasks page returned HTTP $HTTP_CODE"
fi
echo ""

# Test 3: Verify JavaScript bundle exists
echo "3. Testing JavaScript Bundle..."
curl -s https://7qz08gud84b6.space.minimax.io/index.html | grep -o 'index-[^"]*\.js' > /tmp/bundle.txt
if [ -s /tmp/bundle.txt ]; then
    BUNDLE=$(cat /tmp/bundle.txt | head -1)
    echo "   ✓ JavaScript bundle found: $BUNDLE"
else
    echo "   ✗ JavaScript bundle not found"
fi
echo ""

# Test 4: Check CSS bundle
echo "4. Testing CSS Bundle..."
curl -s https://7qz08gud84b6.space.minimax.io/index.html | grep -o 'index-[^"]*\.css' > /tmp/css.txt
if [ -s /tmp/css.txt ]; then
    CSS=$(cat /tmp/css.txt | head -1)
    echo "   ✓ CSS bundle found: $CSS"
else
    echo "   ✗ CSS bundle not found"
fi
echo ""

echo "=== Frontend Build Verification Complete ==="
