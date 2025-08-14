# 🏠 Family Platform VPS Deployment Script (PowerShell)
# This script helps you set up your complete family platform on a DigitalOcean VPS

param(
    [string]$DomainName = "",
    [string]$VpsIp = "",
    [string]$DbPassword = "",
    [string]$JwtSecret = ""
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

Write-Host "🏠 Family Platform VPS Deployment" -ForegroundColor $Blue
Write-Host "==================================" -ForegroundColor $Blue

# Get configuration if not provided
if (-not $DomainName) {
    $DomainName = Read-Host "Enter your domain name (e.g., family.yourdomain.com)"
}

if (-not $VpsIp) {
    $VpsIp = Read-Host "Enter your VPS IP address"
}

if (-not $DbPassword) {
    $DbPassword = Read-Host "Enter a secure database password" -AsSecureString
    $DbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPassword))
}

if (-not $JwtSecret) {
    $JwtSecret = Read-Host "Enter a secure JWT secret" -AsSecureString
    $JwtSecret = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($JwtSecret))
}

# Generate random passwords if not provided
if (-not $DbPassword) {
    $DbPassword = -join ((33..126) | Get-Random -Count 32 | ForEach-Object {[char]$_})
}

if (-not $JwtSecret) {
    $JwtSecret = -join ((33..126) | Get-Random -Count 64 | ForEach-Object {[char]$_})
}

Write-Host "Configuration received! Starting deployment..." -ForegroundColor $Green

# Create deployment instructions file
$DeploymentInstructions = @"
# 🏠 Family Platform VPS Deployment Instructions

## Prerequisites
1. A DigitalOcean account
2. A domain name (optional but recommended)
3. SSH access to your VPS

## Step 1: Create DigitalOcean Droplet

1. Log into DigitalOcean
2. Click "Create" → "Droplets"
3. Choose these settings:
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Basic Droplet ($12/month)
   - **RAM**: 4GB
   - **CPU**: 2 vCPUs
   - **Storage**: 80GB SSD
   - **Region**: Choose closest to your family
   - **Authentication**: SSH key (recommended) or password

## Step 2: Connect to Your VPS

```bash
ssh root@$VpsIp
```

## Step 3: Run the Deployment Script

```bash
# Download the deployment script
wget https://raw.githubusercontent.com/yourusername/elmowafiplatform/main/deploy-family-vps.sh

# Make it executable
chmod +x deploy-family-vps.sh

# Run the deployment
sudo ./deploy-family-vps.sh
```

## Step 4: Configure Your Domain (Optional)

1. Point your domain DNS to: $VpsIp
2. Wait for DNS propagation (can take up to 24 hours)
3. The script will automatically set up SSL certificates

## Step 5: Access Your Family Platform

Once deployment is complete, you can access:

- **Main Platform**: https://$DomainName
- **API Health**: https://$DomainName/api/v1/health
- **Monitoring**: https://$DomainName/monitoring/grafana

## Default Credentials

- **Monitoring**: admin / family123
- **Database**: family_user / $DbPassword

## Security Checklist

- [ ] Change default monitoring password
- [ ] Set up firewall rules
- [ ] Configure regular backups
- [ ] Monitor system resources
- [ ] Set up family member accounts

## Cost Breakdown (Monthly)

- **DigitalOcean Droplet**: `$12`
- **Domain Name**: `$1-2` (optional)
- **SSL Certificate**: `$0` (Let's Encrypt)
- **Backup Storage**: `$2`
- **Total**: `$15-17/month`

## What You Get

✅ **Complete Family Platform**: Photos, memories, travel planning  
✅ **AI-Powered Features**: Smart photo organization, facial recognition  
✅ **Family Activities**: Games, challenges, family tree  
✅ **Privacy**: Your data stays private and secure  
✅ **Control**: You own everything, no third-party tracking  
✅ **Scalability**: Grows with your family's needs  

## Support

If you need help with deployment:
1. Check the logs: `docker-compose -f docker-compose.prod.yml logs`
2. Restart services: `docker-compose -f docker-compose.prod.yml restart`
3. Check system resources: `htop` or `docker stats`

## Next Steps

1. **Create Family Accounts**: Set up accounts for each family member
2. **Import Photos**: Upload your family photos and memories
3. **Configure Privacy**: Set up family privacy settings
4. **Explore Features**: Try the AI features and family activities
5. **Invite Extended Family**: Add grandparents, cousins, etc.

Your family's private digital platform is ready! 🎉
"@

# Save deployment instructions
$DeploymentInstructions | Out-File -FilePath "deployment-instructions.md" -Encoding UTF8

# Create a simple deployment script for the VPS
$VpsScript = @"
#!/bin/bash

# Quick deployment script for your VPS
# Run this on your VPS after connecting via SSH

set -e

echo "🏠 Setting up Family Platform on VPS..."

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /opt/family-platform
cd /opt/family-platform

# Clone your repository (update with your actual repo URL)
git clone https://github.com/yourusername/elmowafiplatform.git .

# Create environment file
cat > .env << 'EOF'
NODE_ENV=production
VITE_API_URL=https://$DomainName
VITE_WS_URL=wss://$DomainName/ws
SECRET_KEY=$JwtSecret
DATABASE_URL=postgresql://family_user:$DbPassword@postgres:5432/family_platform
REDIS_URL=redis://redis:6379/0
JWT_SECRET=$JwtSecret
CORS_ORIGINS=https://$DomainName
EOF

# Start services
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Family Platform deployed successfully!"
echo "🌐 Access your platform at: https://$DomainName"
"@

# Save VPS script
$VpsScript | Out-File -FilePath "vps-deploy.sh" -Encoding UTF8

Write-Host "✅ Deployment files created successfully!" -ForegroundColor $Green
Write-Host ""
Write-Host "📁 Generated Files:" -ForegroundColor $Blue
Write-Host "   - deployment-instructions.md (Complete setup guide)" -ForegroundColor $Yellow
Write-Host "   - vps-deploy.sh (Quick VPS deployment script)" -ForegroundColor $Yellow
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor $Blue
Write-Host "   1. Create a DigitalOcean droplet with Ubuntu 22.04" -ForegroundColor $Yellow
Write-Host "   2. Connect to your VPS via SSH" -ForegroundColor $Yellow
Write-Host "   3. Upload and run the vps-deploy.sh script" -ForegroundColor $Yellow
Write-Host "   4. Follow the deployment-instructions.md guide" -ForegroundColor $Yellow
Write-Host ""
Write-Host "💰 Estimated Cost: $15-17/month" -ForegroundColor $Green
Write-Host "⏱️  Deployment Time: 2-3 hours" -ForegroundColor $Green
Write-Host ""
Write-Host "🎉 Your family's private digital platform will be ready!" -ForegroundColor $Green
