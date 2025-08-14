# Manual Docker Desktop Start and Deployment Guide

Write-Host "Docker Desktop Manual Start Guide" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

Write-Host "`nStep 1: Start Docker Desktop Manually" -ForegroundColor Yellow
Write-Host "1. Open Docker Desktop from the Start Menu" -ForegroundColor White
Write-Host "2. Wait for it to show 'Docker Desktop is running' in the system tray" -ForegroundColor White
Write-Host "3. This may take 2-3 minutes" -ForegroundColor White

Write-Host "`nStep 2: Test Docker Connection" -ForegroundColor Yellow
Write-Host "Run this command to test if Docker is ready:" -ForegroundColor White
Write-Host "docker ps" -ForegroundColor Green

Write-Host "`nStep 3: Deploy the Enhanced System" -ForegroundColor Yellow
Write-Host "Once Docker is ready, run one of these commands:" -ForegroundColor White
Write-Host "`nOption A - Simple Deployment:" -ForegroundColor Cyan
Write-Host ".\deploy-simple.ps1" -ForegroundColor Green

Write-Host "`nOption B - Full Deployment (with monitoring):" -ForegroundColor Cyan
Write-Host ".\deploy-local.ps1" -ForegroundColor Green

Write-Host "`nOption C - Manual Commands:" -ForegroundColor Cyan
Write-Host "docker-compose -f docker-compose.enhanced.yml up -d postgres redis backend frontend" -ForegroundColor Green

Write-Host "`nStep 4: Access Your System" -ForegroundColor Yellow
Write-Host "Once deployed, you can access:" -ForegroundColor White
Write-Host "• Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "• Backend API: http://localhost:8000" -ForegroundColor Green
Write-Host "• GraphQL Playground: http://localhost:8000/api/v1/graphql/playground" -ForegroundColor Green

Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
Write-Host "• If Docker Desktop won't start, restart your computer" -ForegroundColor White
Write-Host "• If ports are in use, run: docker-compose -f docker-compose.enhanced.yml down" -ForegroundColor White
Write-Host "• Check logs with: docker-compose -f docker-compose.enhanced.yml logs -f" -ForegroundColor White

Write-Host "`nReady to proceed? Start Docker Desktop manually and then run the deployment script!" -ForegroundColor Green
