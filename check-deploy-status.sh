#!/bin/bash

echo "🔍 Checking deployment status..."

# Set up paths
export PATH=$PATH:/home/liel/.fly/bin

# Check Fly apps
echo "📱 Fly.io applications:"
flyctl apps list

# Check for fly.toml in budget-system
echo ""
echo "📄 Checking for deployment artifacts:"
cd "/mnt/c/Users/Aliel/OneDrive - Constructor University/Desktop/Elmowafiplatform/budget-system"
if [ -f "fly.toml" ]; then
    echo "✅ fly.toml found - deployment likely successful!"
    ls -la fly.toml
else
    echo "❌ No fly.toml found - deployment may have failed"
fi

# Check .wasp build directory
if [ -d ".wasp" ]; then
    echo "✅ .wasp build directory exists"
    ls -la .wasp/ | head -5
else
    echo "❌ No .wasp build directory"
fi 