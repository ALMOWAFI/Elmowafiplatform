#!/bin/bash

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found. Please create one based on .env.example${NC}"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

echo -e "${YELLOW}Starting deployment of Elmowafy Travel Platform...${NC}"

# Build frontend
echo -e "${GREEN}Building frontend...${NC}"
cd client
npm install
npm run build

# Move build to nginx directory
echo -e "${GREEN}Preparing frontend for deployment...${NC}"
rm -rf ../server/nginx/html/*
cp -r dist/* ../server/nginx/html/

# Build and start containers
echo -e "${GREEN}Starting Docker containers...${NC}"
cd ../server
docker-compose -f docker-compose.prod.yml up -d --build

# Check if containers are running
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    echo -e "\n${YELLOW}Services:${NC}"
    echo -e "- Frontend: https://${DOMAIN:-localhost}"
    echo -e "- Backend API: https://${DOMAIN:-localhost}/api"
    echo -e "- MongoDB Express: https://${DOMAIN:-localhost}/mongo-express"
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "1. Set up SSL certificates with Let's Encrypt"
    echo "2. Configure your domain's DNS to point to this server"
    echo "3. Set up monitoring and alerts"
else
    echo -e "${RED}Deployment failed. Check the logs above for details.${NC}"
    exit 1
fi
