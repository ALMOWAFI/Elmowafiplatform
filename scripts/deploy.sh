#!/bin/bash

# Production deployment script for Elmowafy Family Platform
# Usage: ./scripts/deploy.sh [environment]

set -e

# Configuration
ENVIRONMENT=${1:-staging}
PROJECT_NAME="elmowafy-platform"
DOCKER_REGISTRY="ghcr.io"
IMAGE_NAME="${DOCKER_REGISTRY}/${PROJECT_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment
validate_environment() {
    log_info "Validating deployment environment: $ENVIRONMENT"
    
    if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
        log_error "Invalid environment. Use 'staging' or 'production'"
        exit 1
    fi
    
    # Check required tools
    command -v docker >/dev/null 2>&1 || { log_error "Docker is required but not installed."; exit 1; }
    command -v kubectl >/dev/null 2>&1 || { log_error "kubectl is required but not installed."; exit 1; }
    command -v helm >/dev/null 2>&1 || { log_error "Helm is required but not installed."; exit 1; }
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if git working directory is clean
    if [[ -n $(git status --porcelain) ]]; then
        log_warn "Git working directory is not clean. Uncommitted changes detected."
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Get current git commit
    GIT_COMMIT=$(git rev-parse HEAD)
    GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    
    log_info "Deploying commit: $GIT_COMMIT"
    log_info "From branch: $GIT_BRANCH"
    
    # Validate branch for production
    if [[ "$ENVIRONMENT" == "production" && "$GIT_BRANCH" != "main" ]]; then
        log_error "Production deployments must be from 'main' branch. Current branch: $GIT_BRANCH"
        exit 1
    fi
}

# Build and test
build_and_test() {
    log_info "Building and testing the application..."
    
    # Install dependencies
    log_info "Installing dependencies..."
    cd elmowafy-travels-oasis
    npm ci
    
    # Run tests
    log_info "Running tests..."
    npm run test || {
        log_error "Tests failed. Aborting deployment."
        exit 1
    }
    
    # Build frontend
    log_info "Building frontend..."
    npm run build || {
        log_error "Frontend build failed. Aborting deployment."
        exit 1
    }
    
    # Test backend
    cd server
    npm ci
    npm run test || {
        log_error "Backend tests failed. Aborting deployment."
        exit 1
    }
    
    cd ../..
}

# Build Docker images
build_docker_images() {
    log_info "Building Docker images..."
    
    # Build main application image
    docker build -t ${IMAGE_NAME}:${GIT_COMMIT} \
                 -t ${IMAGE_NAME}:latest \
                 --build-arg GIT_COMMIT=${GIT_COMMIT} \
                 --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
                 .
    
    # Build AI services image
    docker build -t ${IMAGE_NAME}-ai:${GIT_COMMIT} \
                 -t ${IMAGE_NAME}-ai:latest \
                 --build-arg GIT_COMMIT=${GIT_COMMIT} \
                 --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
                 -f ai-services/Dockerfile \
                 ai-services/
    
    log_info "Docker images built successfully"
}

# Push Docker images
push_docker_images() {
    log_info "Pushing Docker images to registry..."
    
    # Login to registry
    echo $GITHUB_TOKEN | docker login $DOCKER_REGISTRY -u $GITHUB_ACTOR --password-stdin
    
    # Push images
    docker push ${IMAGE_NAME}:${GIT_COMMIT}
    docker push ${IMAGE_NAME}:latest
    docker push ${IMAGE_NAME}-ai:${GIT_COMMIT}
    docker push ${IMAGE_NAME}-ai:latest
    
    log_info "Docker images pushed successfully"
}

# Deploy to Kubernetes
deploy_to_kubernetes() {
    log_info "Deploying to Kubernetes cluster..."
    
    # Set kubectl context
    kubectl config use-context ${ENVIRONMENT}
    
    # Update Helm values
    helm upgrade --install ${PROJECT_NAME} ./helm/${PROJECT_NAME} \
        --namespace ${PROJECT_NAME}-${ENVIRONMENT} \
        --create-namespace \
        --set image.tag=${GIT_COMMIT} \
        --set environment=${ENVIRONMENT} \
        --set ingress.enabled=true \
        --set ingress.hostname=${ENVIRONMENT}.elmowafy-platform.com \
        --set mongodb.uri=${MONGODB_URI} \
        --set redis.host=${REDIS_HOST} \
        --set secrets.jwtSecret=${JWT_SECRET} \
        --set secrets.encryptionKey=${ENCRYPTION_KEY} \
        --timeout 10m \
        --wait
    
    log_info "Kubernetes deployment completed"
}

# Health checks
run_health_checks() {
    log_info "Running health checks..."
    
    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app=${PROJECT_NAME} \
        --namespace ${PROJECT_NAME}-${ENVIRONMENT} \
        --timeout=300s
    
    # Get service URL
    if [[ "$ENVIRONMENT" == "production" ]]; then
        SERVICE_URL="https://elmowafy-platform.com"
    else
        SERVICE_URL="https://staging.elmowafy-platform.com"
    fi
    
    # Basic health check
    for i in {1..10}; do
        log_info "Health check attempt $i/10..."
        
        if curl -f -s ${SERVICE_URL}/health > /dev/null; then
            log_info "✅ Application is healthy and responding"
            break
        fi
        
        if [[ $i -eq 10 ]]; then
            log_error "❌ Health checks failed after 10 attempts"
            exit 1
        fi
        
        sleep 30
    done
    
    # Run smoke tests
    log_info "Running smoke tests..."
    npm run test:smoke -- --baseUrl=${SERVICE_URL} || {
        log_warn "Smoke tests failed, but deployment continues"
    }
}

# Database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    kubectl exec -it deployment/${PROJECT_NAME} \
        --namespace ${PROJECT_NAME}-${ENVIRONMENT} \
        -- npm run migrate
    
    log_info "Database migrations completed"
}

# Backup database
backup_database() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log_info "Creating database backup before deployment..."
        
        # Create backup using mongodump
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        
        kubectl run mongodb-backup-${BACKUP_NAME} \
            --image=mongo:6.0 \
            --namespace ${PROJECT_NAME}-${ENVIRONMENT} \
            --rm -i --tty \
            -- mongodump --host ${MONGODB_HOST} \
                         --db elmowafy-travels \
                         --out /backup/${BACKUP_NAME}
        
        log_info "Database backup completed: ${BACKUP_NAME}"
    fi
}

# Rollback function
rollback() {
    log_error "Deployment failed. Initiating rollback..."
    
    helm rollback ${PROJECT_NAME} \
        --namespace ${PROJECT_NAME}-${ENVIRONMENT}
    
    log_info "Rollback completed"
    exit 1
}

# Cleanup old resources
cleanup() {
    log_info "Cleaning up old resources..."
    
    # Remove old Docker images
    docker image prune -a -f --filter "until=72h"
    
    # Clean up old Kubernetes resources
    kubectl delete pod --field-selector=status.phase==Succeeded \
        --namespace ${PROJECT_NAME}-${ENVIRONMENT}
    
    log_info "Cleanup completed"
}

# Notification functions
send_slack_notification() {
    local status=$1
    local message=$2
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Deployment ${status}: ${message}\"}" \
            $SLACK_WEBHOOK_URL
    fi
}

# Main deployment workflow
main() {
    log_info "🚀 Starting deployment of Elmowafy Family Platform to $ENVIRONMENT"
    
    # Set error trap
    trap rollback ERR
    
    # Execute deployment steps
    validate_environment
    pre_deployment_checks
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        backup_database
    fi
    
    build_and_test
    build_docker_images
    push_docker_images
    run_migrations
    deploy_to_kubernetes
    run_health_checks
    cleanup
    
    # Success notification
    send_slack_notification "SUCCESS" "Successfully deployed to $ENVIRONMENT"
    
    log_info "✅ Deployment completed successfully!"
    log_info "🌍 Application is available at: https://${ENVIRONMENT}.elmowafy-platform.com"
    
    # Print deployment summary
    echo ""
    echo "=== DEPLOYMENT SUMMARY ==="
    echo "Environment: $ENVIRONMENT"
    echo "Git Commit: $GIT_COMMIT"
    echo "Git Branch: $GIT_BRANCH"
    echo "Docker Image: ${IMAGE_NAME}:${GIT_COMMIT}"
    echo "Deployed at: $(date)"
    echo "=========================="
}

# Run main function
main "$@"