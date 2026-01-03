#!/bin/bash

cd /workspace/propmaster-rebuild

echo "Installing dependencies..."
pnpm install --prefer-offline > /tmp/install.log 2>&1

echo "Building project..."
pnpm run build > /tmp/build.log 2>&1

echo "Build complete!"
cat /tmp/build.log | tail -20
