# 🚀 Manual Deployment Guide

## Step 1: Wait for Docker Desktop
Make sure Docker Desktop is fully started and running. You'll know it's ready when:
- Docker Desktop icon shows "Docker Desktop is running" 
- The command `docker version` works without errors

## Step 2: Deploy the Enhanced System

### Option A: Using PowerShell Script (Recommended)
```powershell
# Run the deployment script
.\deploy-local.ps1
```

### Option B: Manual Docker Compose
```powershell
# Create necessary directories
mkdir -p data, uploads, logs, memories, output, monitoring/grafana/dashboards, monitoring/grafana/datasources, nginx/conf.d, ssl

# Build and start all services
docker-compose -f docker-compose.enhanced.yml up --build -d

# Check service status
docker-compose -f docker-compose.enhanced.yml ps
```

### Option C: Step by Step
```powershell
# 1. Stop any existing containers
docker-compose -f docker-compose.enhanced.yml down --remove-orphans

# 2. Build the images
docker-compose -f docker-compose.enhanced.yml build

# 3. Start services
docker-compose -f docker-compose.enhanced.yml up -d

# 4. Check logs
docker-compose -f docker-compose.enhanced.yml logs -f
```

## Step 3: Verify Deployment

### Check Service Status
```powershell
docker-compose -f docker-compose.enhanced.yml ps
```

### Test Health Endpoints
```powershell
# Test backend health
curl http://localhost:8000/api/v1/health

# Test service mesh
curl http://localhost:8000/api/v1/service-mesh/status
```

### Access Services
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **GraphQL Playground**: http://localhost:8000/api/v1/graphql/playground
- **Service Mesh**: http://localhost:8000/api/v1/service-mesh/status
- **Consul UI**: http://localhost:8500
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)

## Step 4: Troubleshooting

### If Services Don't Start
```powershell
# Check logs
docker-compose -f docker-compose.enhanced.yml logs -f

# Check specific service
docker-compose -f docker-compose.enhanced.yml logs backend
```

### If Ports Are in Use
```powershell
# Check what's using the ports
netstat -ano | findstr :8000
netstat -ano | findstr :5173

# Stop conflicting services
docker-compose -f docker-compose.enhanced.yml down
```

### If Build Fails
```powershell
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose -f docker-compose.enhanced.yml build --no-cache
```

## Step 5: Test the Enhanced Features

### 1. Test API Versioning
Visit: http://localhost:8000/api/v1/health

### 2. Test GraphQL
Visit: http://localhost:8000/api/v1/graphql/playground
Try this query:
```graphql
query {
  health {
    status
    timestamp
  }
}
```

### 3. Test Service Mesh
Visit: http://localhost:8000/api/v1/service-mesh/status

### 4. Test Frontend Integration
Visit: http://localhost:5173
- Navigate between sections
- Check for real-time updates
- Verify connected components

### 5. Test Monitoring
Visit: http://localhost:3000 (Grafana)
- Login: admin/admin
- View dashboards

## Success Indicators

✅ **All containers are running**  
✅ **Frontend loads at http://localhost:5173**  
✅ **API responds at http://localhost:8000/api/v1/health**  
✅ **GraphQL playground works**  
✅ **Service mesh shows status**  
✅ **Components are connected (no isolation)**  
✅ **Real-time updates work**  

## Next Steps

1. Explore the GraphQL Playground
2. Check the Service Mesh dashboard
3. Monitor performance in Grafana
4. Test real-time features
5. Review the integration layer code

---

**Need Help?** Check the logs or refer to:
- `QUICK_START_GUIDE.md`
- `API_ENHANCEMENTS.md`
- `INTEGRATION_LAYER_SOLUTION.md`
