#!/bin/bash

# Elmowafy Travels Oasis - Deployment Script
# This script helps deploy the application using Docker

set -e

echo "🚀 Elmowafy Travels Oasis - Deployment Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Build the application
build_app() {
    print_status "Building the application..."
    
    # Build frontend
    print_status "Building frontend..."
    npm run build
    
    print_success "Application built successfully"
}

# Build Docker images
build_docker() {
    print_status "Building Docker images..."
    
    # Build frontend image
    print_status "Building frontend Docker image..."
    docker build -t elmowafy-frontend:latest .
    
    print_success "Docker images built successfully"
}

# Start the application
start_app() {
    print_status "Starting the application..."
    
    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found"
        exit 1
    fi
    
    # Start services
    docker-compose up -d
    
    print_success "Application started successfully"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend API: http://localhost:8000"
    print_status "Grafana: http://localhost:3001 (admin/admin)"
    print_status "Prometheus: http://localhost:9090"
}

# Stop the application
stop_app() {
    print_status "Stopping the application..."
    
    docker-compose down
    
    print_success "Application stopped successfully"
}

# Show application status
status() {
    print_status "Application status:"
    docker-compose ps
}

# Show logs
logs() {
    print_status "Showing application logs..."
    docker-compose logs -f
}

# Clean up
cleanup() {
    print_warning "This will remove all containers, images, and volumes. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up..."
        docker-compose down -v --rmi all
        docker system prune -f
        print_success "Cleanup completed"
    else
        print_status "Cleanup cancelled"
    fi
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    # Check frontend
    if curl -f http://localhost:3000/health &> /dev/null; then
        print_success "Frontend is healthy"
    else
        print_error "Frontend health check failed"
    fi
    
    # Check backend
    if curl -f http://localhost:8000/health &> /dev/null; then
        print_success "Backend is healthy"
    else
        print_error "Backend health check failed"
    fi
}

# Main script logic
case "${1:-help}" in
    "build")
        check_docker
        build_app
        build_docker
        ;;
    "start")
        check_docker
        start_app
        ;;
    "stop")
        stop_app
        ;;
    "restart")
        stop_app
        start_app
        ;;
    "status")
        status
        ;;
    "logs")
        logs
        ;;
    "health")
        health_check
        ;;
    "cleanup")
        cleanup
        ;;
    "deploy")
        check_docker
        build_app
        build_docker
        start_app
        health_check
        ;;
    "help"|*)
        echo "Usage: $0 {build|start|stop|restart|status|logs|health|cleanup|deploy}"
        echo ""
        echo "Commands:"
        echo "  build   - Build the application and Docker images"
        echo "  start   - Start the application using Docker Compose"
        echo "  stop    - Stop the application"
        echo "  restart - Restart the application"
        echo "  status  - Show application status"
        echo "  logs    - Show application logs"
        echo "  health  - Perform health checks"
        echo "  cleanup - Remove all containers, images, and volumes"
        echo "  deploy  - Full deployment (build + start + health check)"
        echo "  help    - Show this help message"
        ;;
esac
