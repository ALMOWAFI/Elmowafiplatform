#!/bin/bash

# Railway Deployment Script for Elmowafiplatform
# This script helps deploy the API to Railway

set -e  # Exit on any error

echo "🚀 Starting Railway Deployment for Elmowafiplatform API"
echo "=================================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   Then run: railway login"
    exit 1
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run:"
    echo "   railway login"
    exit 1
fi

echo "✅ Railway CLI found and authenticated"

# Check if we're in the right directory
if [ ! -f "Dockerfile" ] || [ ! -f "railway.toml" ]; then
    echo "❌ Please run this script from the project root directory"
    echo "   (where Dockerfile and railway.toml are located)"
    exit 1
fi

echo "✅ Project structure verified"

# Check if hack2 directory exists
if [ ! -d "hack2" ]; then
    echo "❌ hack2 directory not found. This is required for AI services."
    exit 1
fi

echo "✅ AI services directory found"

# Check if API directory exists
if [ ! -d "elmowafiplatform-api" ]; then
    echo "❌ elmowafiplatform-api directory not found."
    exit 1
fi

echo "✅ API directory found"

# Deploy to Railway
echo "🚀 Deploying to Railway..."
echo "   This may take a few minutes..."

railway up

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🔗 Your API should now be available at:"
echo "   https://your-app-name.railway.app"
echo ""
echo "📊 Check deployment status:"
echo "   railway status"
echo ""
echo "📝 View logs:"
echo "   railway logs"
echo ""
echo "🔧 Manage your deployment:"
echo "   railway dashboard"
echo ""
echo "🎉 Your Elmowafiplatform API is now live!" 