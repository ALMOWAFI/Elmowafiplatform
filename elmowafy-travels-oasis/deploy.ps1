# Elmowafy Travels Oasis - PowerShell Deployment Script
# This script helps deploy the application using Docker on Windows

param(
    [Parameter(Position=0)]
    [ValidateSet("build", "start", "stop", "restart", "status", "logs", "health", "cleanup", "deploy", "help")]
    [string]$Command = "help"
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

# Check if Docker is installed
function Test-Docker {
    Write-Status "Checking Docker installation..."
    
    try {
        $null = docker --version
        $null = docker-compose --version
        Write-Success "Docker and Docker Compose are installed"
        return $true
    }
    catch {
        Write-Error "Docker is not installed or not in PATH. Please install Docker Desktop for Windows."
        return $false
    }
}

# Build the application
function Build-App {
    Write-Status "Building the application..."
    
    try {
        Write-Status "Building frontend..."
        npm run build
        Write-Success "Application built successfully"
        return $true
    }
    catch {
        Write-Error "Failed to build application"
        return $false
    }
}

# Build Docker images
function Build-Docker {
    Write-Status "Building Docker images..."
    
    try {
        Write-Status "Building frontend Docker image..."
        docker build -t elmowafy-frontend:latest .
        Write-Success "Docker images built successfully"
        return $true
    }
    catch {
        Write-Error "Failed to build Docker images"
        return $false
    }
}

# Start the application
function Start-App {
    Write-Status "Starting the application..."
    
    if (-not (Test-Path "docker-compose.yml")) {
        Write-Error "docker-compose.yml not found"
        return $false
    }
    
    try {
        docker-compose up -d
        Write-Success "Application started successfully"
        Write-Status "Frontend: http://localhost:3000"
        Write-Status "Backend API: http://localhost:8000"
        return $true
    }
    catch {
        Write-Error "Failed to start application"
        return $false
    }
}

# Stop the application
function Stop-App {
    Write-Status "Stopping the application..."
    
    try {
        docker-compose down
        Write-Success "Application stopped successfully"
        return $true
    }
    catch {
        Write-Error "Failed to stop application"
        return $false
    }
}

# Show application status
function Show-Status {
    Write-Status "Application status:"
    docker-compose ps
}

# Show logs
function Show-Logs {
    Write-Status "Showing application logs..."
    docker-compose logs -f
}

# Clean up
function Cleanup {
    Write-Warning "This will remove all containers, images, and volumes. Are you sure? (y/N)"
    $response = Read-Host
    
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Status "Cleaning up..."
        docker-compose down -v --rmi all
        docker system prune -f
        Write-Success "Cleanup completed"
    }
    else {
        Write-Status "Cleanup cancelled"
    }
}

# Health check
function Test-Health {
    Write-Status "Performing health checks..."
    
    # Check frontend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success "Frontend is healthy"
        }
        else {
            Write-Error "Frontend health check failed"
        }
    }
    catch {
        Write-Error "Frontend health check failed"
    }
    
    # Check backend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success "Backend is healthy"
        }
        else {
            Write-Error "Backend health check failed"
        }
    }
    catch {
        Write-Error "Backend health check failed"
    }
}

# Main script logic
Write-Host "🚀 Elmowafy Travels Oasis - PowerShell Deployment Script" -ForegroundColor $Blue
Write-Host "=====================================================" -ForegroundColor $Blue

switch ($Command) {
    "build" {
        if (Test-Docker) {
            Build-App
            Build-Docker
        }
    }
    "start" {
        if (Test-Docker) {
            Start-App
        }
    }
    "stop" {
        Stop-App
    }
    "restart" {
        Stop-App
        Start-App
    }
    "status" {
        Show-Status
    }
    "logs" {
        Show-Logs
    }
    "health" {
        Test-Health
    }
    "cleanup" {
        Cleanup
    }
    "deploy" {
        if (Test-Docker) {
            Build-App
            Build-Docker
            Start-App
            Test-Health
        }
    }
    "help" {
        Write-Host "Usage: .\deploy.ps1 {build|start|stop|restart|status|logs|health|cleanup|deploy}" -ForegroundColor $Yellow
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor $Yellow
        Write-Host "  build   - Build the application and Docker images"
        Write-Host "  start   - Start the application using Docker Compose"
        Write-Host "  stop    - Stop the application"
        Write-Host "  restart - Restart the application"
        Write-Host "  status  - Show application status"
        Write-Host "  logs    - Show application logs"
        Write-Host "  health  - Perform health checks"
        Write-Host "  cleanup - Remove all containers, images, and volumes"
        Write-Host "  deploy  - Full deployment (build + start + health check)"
        Write-Host "  help    - Show this help message"
    }
}
