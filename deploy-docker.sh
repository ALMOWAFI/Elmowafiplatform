#!/bin/bash

echo "========================================"
echo " Elmowafiplatform Docker Deployment"
echo "========================================"
echo

echo "[1/5] Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ ERROR: Docker is not installed or not running"
    echo "Please install Docker Desktop and make sure it's running"
    exit 1
fi
echo "✅ Docker is available"

echo
echo "[2/5] Stopping any existing containers..."
docker-compose down

echo
echo "[3/5] Building containers (this may take a few minutes)..."
docker-compose build

echo
echo "[4/5] Starting services..."
docker-compose up -d

echo
echo "[5/5] Waiting for services to be ready..."
sleep 10

echo
echo "========================================"
echo " 🚀 Deployment Complete!"
echo "========================================"
echo
echo "Your Elmowafiplatform is now running:"
echo
echo "📱 Frontend (React): http://localhost:5173"
echo "🔧 Backend API:      http://localhost:8000"
echo "📊 API Health:       http://localhost:8000/api/v1/health"
echo "🎯 Family AI Demo:   http://localhost:5173/family-ai-demo"
echo "💾 Redis Cache:      localhost:6379"
echo
echo "To view logs: docker-compose logs -f"
echo "To stop:      docker-compose down"
echo
echo "Happy coding! 🎉"