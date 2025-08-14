#!/bin/bash

# 🚀 Production Deployment Script for Fixed Database System
# This script deploys your family platform to production

set -e

echo "🚀 Starting Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
print_status "Creating directories..."
mkdir -p {data/{postgres,redis},logs,uploads,ssl,nginx/conf.d,backups}

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found. Please create it first."
    echo "Example .env.production:"
    echo "DB_PASSWORD=your_secure_postgres_password"
    echo "REDIS_PASSWORD=your_secure_redis_password"
    echo "JWT_SECRET_KEY=your_super_secure_jwt_secret_key"
    echo "ENVIRONMENT=production"
    exit 1
fi

# Copy environment file
print_status "Setting up environment..."
cp .env.production .env

# Check if required files exist
required_files=("docker-compose.prod.yml" "Dockerfile.backend" "main_fixed.py" "database_config_fixed.py" "database_async_operations.py")

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file $file not found!"
        exit 1
    fi
done

print_status "All required files found."

# Stop existing containers if running
print_status "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

# Build and start services
print_status "Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check PostgreSQL
if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U family_user -d family_platform >/dev/null 2>&1; then
    print_status "✅ PostgreSQL is healthy"
else
    print_error "❌ PostgreSQL is not healthy"
    docker-compose -f docker-compose.prod.yml logs postgres
    exit 1
fi

# Check Redis
if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping >/dev/null 2>&1; then
    print_status "✅ Redis is healthy"
else
    print_error "❌ Redis is not healthy"
    docker-compose -f docker-compose.prod.yml logs redis
    exit 1
fi

# Check Backend
if curl -f http://localhost:8001/api/v1/health >/dev/null 2>&1; then
    print_status "✅ Backend is healthy"
else
    print_error "❌ Backend is not healthy"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

# Check Nginx
if curl -f http://localhost >/dev/null 2>&1; then
    print_status "✅ Nginx is healthy"
else
    print_error "❌ Nginx is not healthy"
    docker-compose -f docker-compose.prod.yml logs nginx
    exit 1
fi

# Show service status
print_status "Service status:"
docker-compose -f docker-compose.prod.yml ps

# Show health check details
print_status "Health check details:"
curl -s http://localhost:8001/api/v1/health | jq . 2>/dev/null || curl -s http://localhost:8001/api/v1/health

# Show database stats
print_status "Database statistics:"
curl -s http://localhost:8001/api/v1/stats | jq . 2>/dev/null || curl -s http://localhost:8001/api/v1/stats

# Create backup script
print_status "Creating backup script..."
cat > backup.sh << 'EOF'
#!/bin/bash
# Database backup script
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="$(docker-compose -f docker-compose.prod.yml ps -q postgres)"

mkdir -p $BACKUP_DIR

# Create database backup
docker exec $DB_CONTAINER pg_dump -U family_user family_platform > $BACKUP_DIR/family_platform_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/family_platform_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "family_platform_*.sql.gz" -mtime +7 -delete

echo "Backup completed: family_platform_$DATE.sql.gz"
EOF

chmod +x backup.sh

# Create monitoring script
print_status "Creating monitoring script..."
cat > monitor.sh << 'EOF'
#!/bin/bash
# Monitoring script
echo "=== Family Platform Monitoring ==="
echo "Time: $(date)"
echo ""

echo "=== Container Status ==="
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "=== Health Check ==="
curl -s http://localhost:8001/api/v1/health | jq . 2>/dev/null || curl -s http://localhost:8001/api/v1/health

echo ""
echo "=== Database Stats ==="
curl -s http://localhost:8001/api/v1/stats | jq . 2>/dev/null || curl -s http://localhost:8001/api/v1/stats

echo ""
echo "=== Resource Usage ==="
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
EOF

chmod +x monitor.sh

# Create SSL setup instructions
print_status "Creating SSL setup instructions..."
cat > SSL_SETUP.md << 'EOF'
# SSL Certificate Setup

## 1. Get SSL Certificate
```bash
# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx

# Get SSL certificate (replace with your domain)
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/

# Set permissions
sudo chown -R $USER:$USER ./ssl
chmod 600 ./ssl/*.pem

# Start nginx
docker-compose -f docker-compose.prod.yml up -d nginx
```

## 2. Update Nginx Configuration
Update nginx/nginx.conf to include SSL configuration.

## 3. Auto-renewal
Add to crontab:
```bash
0 12 * * * /usr/bin/certbot renew --quiet
```
EOF

print_status "✅ Production deployment completed successfully!"

echo ""
echo "🎉 Your Family Platform is now running in production!"
echo ""
echo "📊 Service URLs:"
echo "   - Application: http://localhost"
echo "   - API Health: http://localhost:8001/api/v1/health"
echo "   - API Stats: http://localhost:8001/api/v1/stats"
echo ""
echo "🔧 Management Commands:"
echo "   - View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "   - Monitor: ./monitor.sh"
echo "   - Backup: ./backup.sh"
echo "   - Stop: docker-compose -f docker-compose.prod.yml down"
echo "   - Restart: docker-compose -f docker-compose.prod.yml restart"
echo ""
echo "🔒 Next Steps:"
echo "   1. Set up SSL certificates (see SSL_SETUP.md)"
echo "   2. Configure your domain name"
echo "   3. Set up monitoring and alerts"
echo "   4. Configure automated backups"
echo ""
echo "🚀 Your family platform is now production-ready with:"
echo "   ✅ PostgreSQL database with connection pooling"
echo "   ✅ Redis caching"
echo "   ✅ Async operations"
echo "   ✅ Health monitoring"
echo "   ✅ Nginx reverse proxy"
echo "   ✅ Docker containerization"
echo ""
