#!/bin/bash

# Unified Platform Deployment Script for Railway
# Deploys the complete Elmowafiplatform with unified database

set -e  # Exit on any error

echo "🚀 Starting Unified Platform Deployment to Railway"
echo "=================================================="

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

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   Then run: railway login"
    exit 1
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    print_error "Not logged in to Railway. Please run:"
    echo "   railway login"
    exit 1
fi

print_success "Railway CLI found and authenticated"

# Check if we're in the right directory
if [ ! -f "Dockerfile" ] || [ ! -f "railway.toml" ]; then
    print_error "Please run this script from the project root directory"
    echo "   (where Dockerfile and railway.toml are located)"
    exit 1
fi

print_success "Project structure verified"

# Check required directories
required_dirs=("elmowafiplatform-api" "hack2" "budget-system")
for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        print_error "Required directory not found: $dir"
        exit 1
    fi
done

print_success "All required directories found"

# Check if unified database schema exists
if [ ! -f "unified_database_schema.sql" ]; then
    print_error "Unified database schema not found: unified_database_schema.sql"
    exit 1
fi

print_success "Unified database schema found"

# Check if migration script exists
if [ ! -f "database_migrations.py" ]; then
    print_error "Database migration script not found: database_migrations.py"
    exit 1
fi

print_success "Database migration script found"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p elmowafiplatform-api/data
mkdir -p elmowafiplatform-api/uploads
mkdir -p elmowafiplatform-api/logs
mkdir -p elmowafiplatform-api/face_models
mkdir -p elmowafiplatform-api/training_images

# Copy unified database files to API directory
print_status "Copying unified database files..."
cp unified_database_schema.sql elmowafiplatform-api/
cp database_migrations.py elmowafiplatform-api/

# Update Dockerfile for unified platform
print_status "Updating Dockerfile for unified platform..."
cat > Dockerfile << 'EOF'
# Multi-stage Docker build for Unified Elmowafiplatform
# Optimized for production deployment with PostgreSQL

# Stage 1: Build dependencies
FROM python:3.11-slim as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies required for building
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    pkg-config \
    libopencv-dev \
    libdlib-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements and install Python dependencies
COPY elmowafiplatform-api/requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Stage 2: Production image
FROM python:3.11-slim as production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH="/app"

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libopencv-dev \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Create app user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Create application directory
WORKDIR /app

# Copy application code
COPY elmowafiplatform-api/ .
# Copy hack2 AI services
COPY hack2/ ./hack2/
# Copy unified database files
COPY unified_database_schema.sql .
COPY database_migrations.py .

# Create necessary directories with proper permissions
RUN mkdir -p data uploads logs face_models training_images && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import requests; response = requests.get('http://localhost:8000/api/health'); exit(0) if response.status_code == 200 else exit(1)"

# Default command
CMD ["python", "main.py"]
EOF

print_success "Dockerfile updated for unified platform"

# Update railway.toml for unified platform
print_status "Updating Railway configuration..."
cat > railway.toml << 'EOF'
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[environments.production]
[environments.production.variables]
ENVIRONMENT = "production"
PYTHONPATH = "/app"
JWT_SECRET_KEY = "${{JWT_SECRET_KEY}}"
DATABASE_URL = "${{DATABASE_URL}}"
BUDGET_DATABASE_URL = "${{DATABASE_URL}}"
REDIS_URL = "${{REDIS_URL}}"
CORS_ORIGINS = "${{CORS_ORIGINS}}"
AZURE_AI_ENDPOINT = "${{AZURE_AI_ENDPOINT}}"
AZURE_AI_KEY = "${{AZURE_AI_KEY}}"
GOOGLE_AI_KEY = "${{GOOGLE_AI_KEY}}"
FILE_UPLOAD_PATH = "/app/uploads"
MAX_FILE_SIZE = "10485760"
RATE_LIMIT_ENABLED = "true"
LOG_LEVEL = "INFO"
PORT = "${{PORT}}"

[environments.staging]
[environments.staging.variables]
ENVIRONMENT = "staging"
PYTHONPATH = "/app"
JWT_SECRET_KEY = "${{STAGING_JWT_SECRET_KEY}}"
DATABASE_URL = "${{STAGING_DATABASE_URL}}"
BUDGET_DATABASE_URL = "${{STAGING_DATABASE_URL}}"
LOG_LEVEL = "DEBUG"
PORT = "${{PORT}}"

# Services configuration
[[services]]
name = "elmowafiplatform-unified"
source = "."

[services.build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[services.variables]
ENVIRONMENT = "production"
PORT = 8000
EOF

print_success "Railway configuration updated"

# Create deployment script
print_status "Creating deployment script..."
cat > deploy-unified.sh << 'EOF'
#!/bin/bash

# Deploy unified platform to Railway
echo "🚀 Deploying Unified Platform to Railway..."

# Run database migration if DATABASE_URL is set
if [ ! -z "$DATABASE_URL" ]; then
    echo "📊 Running database migration..."
    python database_migrations.py
fi

# Start the application
echo "🚀 Starting unified platform..."
python main.py
EOF

chmod +x deploy-unified.sh

print_success "Deployment script created"

# Create environment template
print_status "Creating environment template..."
cat > .env.template << 'EOF'
# Unified Platform Environment Variables
# Copy this to .env and fill in your values

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/elmowafiplatform
BUDGET_DATABASE_URL=postgresql://username:password@localhost:5432/elmowafiplatform

# Authentication
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Services
AZURE_AI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_AI_KEY=your-azure-ai-key
GOOGLE_AI_KEY=your-google-ai-key

# File Upload
FILE_UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=INFO
ENVIRONMENT=production

# Port
PORT=8000
EOF

print_success "Environment template created"

# Create README for deployment
print_status "Creating deployment README..."
cat > DEPLOYMENT_README.md << 'EOF'
# Unified Platform Deployment Guide

## Overview
This deployment includes the complete unified Elmowafiplatform with:
- Unified PostgreSQL database
- Budget management system
- Photo and memory management
- AI-powered games
- Travel planning
- Cultural heritage preservation

## Prerequisites
1. Railway CLI installed and authenticated
2. PostgreSQL database provisioned on Railway
3. Environment variables configured

## Deployment Steps

### 1. Set up Railway Project
```bash
# Create new Railway project
railway init

# Add PostgreSQL plugin
railway add postgresql
```

### 2. Configure Environment Variables
Set the following environment variables in Railway:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET_KEY`: Secret key for JWT tokens
- `AZURE_AI_ENDPOINT`: Azure AI endpoint (optional)
- `AZURE_AI_KEY`: Azure AI key (optional)
- `GOOGLE_AI_KEY`: Google AI key (optional)

### 3. Deploy
```bash
# Deploy to Railway
railway up

# Check deployment status
railway status

# View logs
railway logs
```

### 4. Database Migration
The database migration will run automatically on first deployment.
If you need to run it manually:
```bash
railway run python database_migrations.py
```

## API Endpoints

### Health Check
- `GET /api/health`

### Family Management
- `POST /api/family/members` - Create family member
- `GET /api/family/members` - Get family members
- `POST /api/family/groups` - Create family group

### Memories and Photos
- `POST /api/memories` - Create memory
- `GET /api/memories` - Get memories
- `POST /api/memories/upload` - Upload photo

### Budget Management
- `POST /api/budget/profiles` - Create budget profile
- `POST /api/budget/envelopes` - Create budget envelope
- `POST /api/budget/transactions` - Add transaction
- `GET /api/budget/summary/{profile_id}` - Get budget summary

### Games
- `POST /api/games/sessions` - Create game session
- `GET /api/games/sessions/active` - Get active sessions
- `PUT /api/games/sessions/{session_id}` - Update session

### Travel Planning
- `POST /api/travel/plans` - Create travel plan
- `GET /api/travel/plans` - Get travel plans

### Cultural Heritage
- `POST /api/cultural-heritage` - Save heritage item
- `GET /api/cultural-heritage` - Get heritage items

### Dashboard
- `GET /api/dashboard/{family_group_id}` - Get family dashboard
- `GET /api/analytics/memories/{family_group_id}` - Get memory analytics

## Monitoring
- Health check: `/api/health`
- Railway logs: `railway logs`
- Railway dashboard: `railway dashboard`

## Troubleshooting

### Database Connection Issues
1. Check `DATABASE_URL` environment variable
2. Ensure PostgreSQL is running
3. Verify database permissions

### AI Services Issues
1. Check Azure/Google AI credentials
2. Verify API endpoints are accessible
3. Check rate limits

### File Upload Issues
1. Verify upload directory permissions
2. Check file size limits
3. Ensure storage is available
EOF

print_success "Deployment README created"

# Deploy to Railway
print_status "Deploying to Railway..."
echo "   This may take a few minutes..."

railway up

print_success "Deployment completed!"

echo ""
print_success "Your unified platform is now deployed!"
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
echo "📚 Read the deployment guide:"
echo "   DEPLOYMENT_README.md"
echo ""
print_success "🎉 Your unified Elmowafiplatform is now live!" 