# Wait for Docker Desktop and Deploy Enhanced Elmowafiplatform

Write-Host "Waiting for Docker Desktop to be ready..." -ForegroundColor Yellow

# Wait for Docker to be ready
$maxAttempts = 30
$attempt = 0

while ($attempt -lt $maxAttempts) {
    try {
        docker ps | Out-Null
        Write-Host "Docker Desktop is ready!" -ForegroundColor Green
        break
    } catch {
        $attempt++
        Write-Host "Attempt $attempt/$maxAttempts - Docker Desktop is still starting..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
}

if ($attempt -eq $maxAttempts) {
    Write-Host "Docker Desktop is not ready after $maxAttempts attempts. Please check Docker Desktop manually." -ForegroundColor Red
    exit 1
}

# Create necessary directories
Write-Host "Creating necessary directories..." -ForegroundColor Yellow
$directories = @(
    "data",
    "uploads", 
    "logs",
    "memories",
    "output"
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
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "  Created: .env" -ForegroundColor Green
}

# Stop any existing containers
Write-Host "Stopping any existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.enhanced.yml down --remove-orphans 2>$null

# Start essential services
Write-Host "Starting essential services..." -ForegroundColor Yellow
docker-compose -f docker-compose.enhanced.yml up -d postgres redis backend frontend

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

Write-Host "`nEnhanced Elmowafiplatform is now running!" -ForegroundColor Green
Write-Host "Open http://localhost:5173 in your browser to see the enhanced system." -ForegroundColor Green
