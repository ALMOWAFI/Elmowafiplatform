#!/bin/bash

echo "🚀 Starting deployment..."

# Setup environment
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use v20.19.4

export PATH="$PATH:/home/liel/.local/bin:/home/liel/.fly/bin"

# Go to project
cd budget-system

# Deploy
echo "🚀 Deploying aliel-budget-app-prod to mia region..."
wasp deploy fly launch aliel-budget-app-prod mia

echo "✅ Done!" 