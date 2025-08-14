# Enhanced Elmowafiplatform Local Deployment Script for Windows
# This script will start all services with the new integration layer

Write-Host "Starting Enhanced Elmowafiplatform..." -ForegroundColor Green

# Check if Docker Desktop is running
Write-Host "Checking Docker Desktop status..." -ForegroundColor Yellow
try {
    docker version | Out-Null
    Write-Host "Docker Desktop is running" -ForegroundColor Green
} catch {
    Write-Host "Docker Desktop is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Create necessary directories
Write-Host "Creating necessary directories..." -ForegroundColor Yellow
$directories = @(
    "data",
    "uploads", 
    "logs",
    "memories",
    "output",
    "monitoring/grafana/dashboards",
    "monitoring/grafana/datasources",
    "nginx/conf.d",
    "ssl"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Green
    }
}

# Create .env file if it doesn't exist
if (!(Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    @"
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
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "  Created: .env" -ForegroundColor Green
}

# Stop any existing containers
Write-Host "Stopping any existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.enhanced.yml down --remove-orphans

# Build and start services
Write-Host "Building and starting services..." -ForegroundColor Yellow
docker-compose -f docker-compose.enhanced.yml up --build -d

# Wait for services to be ready
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service status
Write-Host "Checking service status..." -ForegroundColor Yellow
docker-compose -f docker-compose.enhanced.yml ps

# Display access URLs
Write-Host "`nAccess URLs:" -ForegroundColor Cyan
Write-Host "  Frontend (React): http://localhost:5173" -ForegroundColor White
Write-Host "  Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "  API v1 Health: http://localhost:8000/api/v1/health" -ForegroundColor White
Write-Host "  GraphQL Playground: http://localhost:8000/api/v1/graphql/playground" -ForegroundColor White
Write-Host "  Service Mesh: http://localhost:8000/api/v1/service-mesh/status" -ForegroundColor White
Write-Host "  Consul UI: http://localhost:8500" -ForegroundColor White
Write-Host "  Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host "  Grafana: http://localhost:3000 (admin/admin)" -ForegroundColor White
Write-Host "  Nginx Proxy: http://localhost:80" -ForegroundColor White

Write-Host "`nMonitoring:" -ForegroundColor Cyan
Write-Host "  View logs: docker-compose -f docker-compose.enhanced.yml logs -f" -ForegroundColor White
Write-Host "  Stop services: docker-compose -f docker-compose.enhanced.yml down" -ForegroundColor White

Write-Host "`nEnhanced Elmowafiplatform is now running!" -ForegroundColor Green
Write-Host "Open http://localhost:5173 in your browser to see the enhanced system." -ForegroundColor Green
