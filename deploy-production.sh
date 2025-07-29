#!/bin/bash
set -e  # Exit on any error

echo "🚀 Starting Production Deployment..."
echo "=================================="

# Function to check command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ $1 not found. Please install it first."
        exit 1
    fi
}

# Set up environment paths
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export PATH=$PATH:/home/liel/.local/bin:/home/liel/.fly/bin

echo "🔧 Setting up environment..."

# Use Node.js 20
nvm use v20.19.4
echo "✅ Node version: $(node --version)"

# Verify all required tools
check_command "wasp"
check_command "flyctl"

echo "✅ All tools available"

# Navigate to project directory
PROJECT_DIR="/mnt/c/Users/Aliel/OneDrive - Constructor University/Desktop/Elmowafiplatform/budget-system"
cd "$PROJECT_DIR"

echo "📍 Working directory: $(pwd)"

# Verify we're in a Wasp project
if [ ! -f "main.wasp" ]; then
    echo "❌ main.wasp not found. Are we in the right directory?"
    exit 1
fi

echo "✅ Wasp project confirmed"

# Check Fly.io authentication
echo "🔐 Checking Fly.io authentication..."
if ! flyctl auth whoami &> /dev/null; then
    echo "❌ Not authenticated with Fly.io. Please run 'flyctl auth login' first."
    exit 1
fi

echo "✅ Authenticated with Fly.io as: $(flyctl auth whoami)"

# Clean any existing deployment artifacts
echo "🧹 Cleaning previous deployment artifacts..."
rm -f fly.toml
rm -rf .fly/

# Start deployment
echo "🚀 Starting Wasp deployment..."
echo "App name: aliel-budget-app-prod"
echo "Region: mia (Miami)"
echo ""

# Execute deployment with verbose output
wasp deploy fly launch aliel-budget-app-prod mia

echo ""
echo "✅ Deployment completed successfully!"
echo "🌐 Your app should now be available online."

# Check final status
echo "📊 Final deployment status:"
flyctl apps list 