#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Setup environment
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    source "$NVM_DIR/nvm.sh"
fi

nvm use v20.19.4
export PATH="$PATH:/home/liel/.local/bin:/home/liel/.fly/bin"

# Navigate to project
cd "/mnt/c/Users/Aliel/OneDrive - Constructor University/Desktop/Elmowafiplatform/budget-system"

echo "✅ Environment ready"
echo "📍 Location: $(pwd)"
echo "📦 Node: $(node --version)"

# Deploy
echo "🚀 Deploying to Fly.io..."
wasp deploy fly launch aliel-budget-app-prod mia

echo "✅ Deployment complete!" 