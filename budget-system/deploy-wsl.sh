#!/bin/bash

# WSL Deployment Script for Budget System
echo "🚀 Starting Wasp deployment from WSL..."

# Set up Node.js environment
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use v20.19.4

# Set up Wasp CLI
export PATH=$PATH:/home/liel/.local/bin

# Set up Fly.io CLI
export FLYCTL_INSTALL="/home/liel/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"

# Navigate to budget system directory
cd "/mnt/c/Users/Aliel/OneDrive - Constructor University/Desktop/Elmowafiplatform/budget-system"

echo "🔧 Environment setup complete"
echo "📦 Node version: $(node --version)"
echo "🐝 Wasp version: $(wasp version)"
echo "✈️ Fly CLI version: $(flyctl version)"

echo "🚀 Starting deployment..."
# Deploy with unique app name
wasp deploy fly launch aliel-budget-app-$(date +%s) mia

echo "✅ Deployment complete!" 