#!/bin/bash
set -e

echo "==================================="
echo "🚀 FINAL DEPLOYMENT ATTEMPT"
echo "==================================="

# Setup Node.js environment
echo "🔧 Setting up Node.js..."
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    source "$NVM_DIR/nvm.sh"
    echo "✅ NVM loaded"
else
    echo "❌ NVM not found"
    exit 1
fi

# Use Node 20
nvm use v20.19.4
echo "✅ Node version: $(node --version)"

# Setup PATH for Wasp and Fly
export PATH="$PATH:/home/liel/.local/bin:/home/liel/.fly/bin"
echo "✅ PATH configured"

# Verify tools
echo "🔍 Verifying tools..."
which wasp && echo "✅ Wasp found" || { echo "❌ Wasp not found"; exit 1; }
which flyctl && echo "✅ Fly CLI found" || { echo "❌ Fly CLI not found"; exit 1; }

# Navigate to project
PROJECT_PATH="/mnt/c/Users/Aliel/OneDrive - Constructor University/Desktop/Elmowafiplatform/budget-system"
echo "📁 Navigating to: $PROJECT_PATH"
cd "$PROJECT_PATH"

# Verify project
if [ -f "main.wasp" ]; then
    echo "✅ Wasp project confirmed"
else
    echo "❌ main.wasp not found!"
    exit 1
fi

# Check authentication
echo "🔐 Checking Fly.io authentication..."
flyctl auth whoami && echo "✅ Authenticated" || { echo "❌ Not authenticated"; exit 1; }

# Clean previous attempts
echo "🧹 Cleaning previous deployment artifacts..."
rm -f fly.toml
rm -rf .fly/

# Deploy!
echo ""
echo "🚀🚀🚀 STARTING DEPLOYMENT 🚀🚀🚀"
echo "App: aliel-budget-app-prod"
echo "Region: mia"
echo ""

wasp deploy fly launch aliel-budget-app-prod mia

echo ""
echo "✅✅✅ DEPLOYMENT COMPLETED! ✅✅✅"

# Check results
echo "📊 Deployment results:"
flyctl apps list
ls -la fly.toml 2>/dev/null && echo "✅ fly.toml created" || echo "❌ No fly.toml" 