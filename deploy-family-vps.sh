#!/bin/bash

# 🏠 Family Platform VPS Deployment Script
# This script sets up your complete family platform on a DigitalOcean VPS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN_NAME=""
VPS_IP=""
DB_PASSWORD=""
JWT_SECRET=""

echo -e "${BLUE}🏠 Family Platform VPS Deployment${NC}"
echo "=================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run this script as root (use sudo)${NC}"
    exit 1
fi

# Get configuration
echo -e "${YELLOW}Enter your domain name (e.g., family.yourdomain.com):${NC}"
read -r DOMAIN_NAME

echo -e "${YELLOW}Enter your VPS IP address:${NC}"
read -r VPS_IP

echo -e "${YELLOW}Enter a secure database password:${NC}"
read -s DB_PASSWORD
echo

echo -e "${YELLOW}Enter a secure JWT secret:${NC}"
read -s JWT_SECRET
echo

# Generate random passwords if not provided
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -base64 32)
fi

if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 64)
fi

echo -e "${GREEN}Configuration received! Starting deployment...${NC}"

# Update system
echo -e "${BLUE}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install essential packages
echo -e "${BLUE}📦 Installing essential packages...${NC}"
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Docker
echo -e "${BLUE}🐳 Installing Docker...${NC}"
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Docker Compose
echo -e "${BLUE}🐳 Installing Docker Compose...${NC}"
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Node.js
echo -e "${BLUE}📦 Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Nginx
echo -e "${BLUE}🌐 Installing Nginx...${NC}"
apt install -y nginx

# Create application directory
echo -e "${BLUE}📁 Creating application directory...${NC}"
mkdir -p /opt/family-platform
cd /opt/family-platform

# Clone your repository (replace with your actual repo)
echo -e "${BLUE}📥 Cloning your repository...${NC}"
git clone https://github.com/yourusername/elmowafiplatform.git .
# If you have a private repo, you'll need to set up SSH keys first

# Create environment file
echo -e "${BLUE}⚙️ Creating environment configuration...${NC}"
cat > .env << EOF
# Application
NODE_ENV=production
VITE_API_URL=https://${DOMAIN_NAME}
VITE_WS_URL=wss://${DOMAIN_NAME}/ws

# Backend
SECRET_KEY=${JWT_SECRET}
DATABASE_URL=postgresql://family_user:${DB_PASSWORD}@postgres:5432/family_platform
REDIS_URL=redis://redis:6379/0

# AI Services
OPENAI_API_KEY=your-openai-api-key
GOOGLE_AI_API_KEY=your-google-ai-key

# Security
JWT_SECRET=${JWT_SECRET}
CORS_ORIGINS=https://${DOMAIN_NAME}

# Performance
MAX_CONCURRENT_TASKS=10
CACHE_MAX_SIZE=1000
MEMORY_THRESHOLD=0.7

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
LOG_LEVEL=INFO

# WebSocket Security
WS_AUTH_ENABLED=true
WS_RATE_LIMIT=100
WS_RATE_WINDOW=60
EOF

# Create production Docker Compose file
echo -e "${BLUE}🐳 Creating production Docker Compose configuration...${NC}"
cat > docker-compose.prod.yml << EOF
version: '3.8'

services:
  # Backend API
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: family-platform-backend
    restart: unless-stopped
    environment:
      - ENV_FILE=.env
    depends_on:
      - postgres
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
      - ./memories:/app/memories
    networks:
      - family-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8000/api/v1/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend React App
  frontend:
    build:
      context: ./elmowafy-travels-oasis
      dockerfile: Dockerfile.frontend
    container_name: family-platform-frontend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - VITE_API_URL=https://${DOMAIN_NAME}
    depends_on:
      - backend
    networks:
      - family-network

  # Database
  postgres:
    image: postgres:15
    container_name: family-platform-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: family_platform
      POSTGRES_USER: family_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init:/docker-entrypoint-initdb.d
    networks:
      - family-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: family-platform-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - family-network

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    container_name: family-platform-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - family-network

  grafana:
    image: grafana/grafana:latest
    container_name: family-platform-grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=family123
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - family-network

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  family-network:
    driver: bridge
EOF

# Create Nginx configuration
echo -e "${BLUE}🌐 Creating Nginx configuration...${NC}"
cat > /etc/nginx/sites-available/family-platform << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME};
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN_NAME};

    # SSL configuration (will be updated after certificate generation)
    ssl_certificate /etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Monitoring (optional, can be removed for production)
    location /monitoring/ {
        auth_basic "Family Platform Monitoring";
        auth_basic_user_file /etc/nginx/.htpasswd;
        
        location /monitoring/prometheus {
            proxy_pass http://prometheus:9090;
        }
        
        location /monitoring/grafana {
            proxy_pass http://grafana:3000;
        }
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/family-platform /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Install Certbot for SSL
echo -e "${BLUE}🔒 Installing SSL certificate tools...${NC}"
apt install -y certbot python3-certbot-nginx

# Create directories
echo -e "${BLUE}📁 Creating necessary directories...${NC}"
mkdir -p uploads logs memories output data/albums data/face_models

# Set permissions
chown -R www-data:www-data /opt/family-platform
chmod -R 755 /opt/family-platform

# Build and start services
echo -e "${BLUE}🚀 Building and starting services...${NC}"
cd /opt/family-platform
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Generate SSL certificate
echo -e "${BLUE}🔒 Generating SSL certificate...${NC}"
certbot --nginx -d ${DOMAIN_NAME} --non-interactive --agree-tos --email admin@${DOMAIN_NAME}

# Create backup script
echo -e "${BLUE}💾 Creating backup script...${NC}"
cat > /usr/local/bin/backup-family-data.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# Database backup
docker exec family-platform-postgres pg_dump -U family_user family_platform > $BACKUP_DIR/db_backup_$DATE.sql

# Application data backup
tar -czf $BACKUP_DIR/app_data_$DATE.tar.gz -C /opt/family-platform uploads memories data

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/backup-family-data.sh

# Set up cron job for daily backups
echo "0 2 * * * /usr/local/bin/backup-family-data.sh" | crontab -

# Create monitoring password file
echo -e "${BLUE}🔐 Setting up monitoring access...${NC}"
htpasswd -cb /etc/nginx/.htpasswd admin family123

# Restart Nginx
systemctl restart nginx

# Create health check script
echo -e "${BLUE}🏥 Creating health check script...${NC}"
cat > /usr/local/bin/health-check.sh << 'EOF'
#!/bin/bash
# Check if all services are running
services=("family-platform-backend" "family-platform-frontend" "family-platform-postgres" "family-platform-redis")

for service in "${services[@]}"; do
    if ! docker ps | grep -q $service; then
        echo "ERROR: $service is not running!"
        exit 1
    fi
done

# Check API health
if ! curl -f https://your-domain.com/api/v1/health > /dev/null 2>&1; then
    echo "ERROR: API health check failed!"
    exit 1
fi

echo "All services are healthy!"
EOF

chmod +x /usr/local/bin/health-check.sh

# Final status check
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}🎉 Your Family Platform is now live!${NC}"
echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo -e "   Main Platform: https://${DOMAIN_NAME}"
echo -e "   API Health: https://${DOMAIN_NAME}/api/v1/health"
echo -e "   Monitoring: https://${DOMAIN_NAME}/monitoring/grafana"
echo ""
echo -e "${BLUE}🔐 Default Credentials:${NC}"
echo -e "   Monitoring: admin / family123"
echo -e "   Database: family_user / ${DB_PASSWORD}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "   1. Update your domain DNS to point to ${VPS_IP}"
echo -e "   2. Create your first family account"
echo -e "   3. Import your family photos and memories"
echo -e "   4. Set up family member accounts"
echo ""
echo -e "${YELLOW}⚠️  Important Security Notes:${NC}"
echo -e "   - Change default passwords"
echo -e "   - Set up firewall rules"
echo -e "   - Configure regular backups"
echo -e "   - Monitor system resources"
echo ""
echo -e "${GREEN}🚀 Your family's private digital platform is ready!${NC}"
