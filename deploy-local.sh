#!/bin/bash

# Enhanced Elmowafiplatform Local Deployment Script for Linux/Mac
# This script will start all services with the new integration layer

echo "🚀 Starting Enhanced Elmowafiplatform..."

# Check if Docker is running
echo "📋 Checking Docker status..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi
echo "✅ Docker is running"

# Create necessary directories
echo "📁 Creating necessary directories..."
directories=(
    "data"
    "uploads"
    "logs"
    "memories"
    "output"
    "monitoring/grafana/dashboards"
    "monitoring/grafana/datasources"
    "nginx/conf.d"
    "ssl"
)

for dir in "${directories[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo "  ✅ Created: $dir"
    fi
done

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Environment variables for enhanced Elmowafiplatform
ENVIRONMENT=development
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
DATABASE_URL=postgresql://postgres:password@postgres:5432/elmowafiplatform
REDIS_HOST=redis
REDIS_PORT=6379
CONSUL_HOST=consul
CONSUL_PORT=8500
EOF
    echo "  ✅ Created: .env"
fi

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker-compose -f docker-compose.enhanced.yml down --remove-orphans

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.enhanced.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service status
echo "🔍 Checking service status..."
docker-compose -f docker-compose.enhanced.yml ps

# Display access URLs
echo ""
echo "🌐 Access URLs:"
echo "  Frontend (React): http://localhost:5173"
echo "  Backend API: http://localhost:8000"
echo "  API v1 Health: http://localhost:8000/api/v1/health"
echo "  GraphQL Playground: http://localhost:8000/api/v1/graphql/playground"
echo "  Service Mesh: http://localhost:8000/api/v1/service-mesh/status"
echo "  Consul UI: http://localhost:8500"
echo "  Prometheus: http://localhost:9090"
echo "  Grafana: http://localhost:3000 (admin/admin)"
echo "  Nginx Proxy: http://localhost:80"

echo ""
echo "📊 Monitoring:"
echo "  View logs: docker-compose -f docker-compose.enhanced.yml logs -f"
echo "  Stop services: docker-compose -f docker-compose.enhanced.yml down"

echo ""
echo "✅ Enhanced Elmowafiplatform is now running!"
echo "🎉 Open http://localhost:5173 in your browser to see the enhanced system."
