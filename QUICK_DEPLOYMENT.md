# 🚀 Quick Deployment Guide

## Current Status
Docker Desktop is starting up. Once it's fully ready, you'll be able to deploy the enhanced system.

## Step 1: Wait for Docker Desktop
Make sure Docker Desktop shows "Docker Desktop is running" in the system tray.

## Step 2: Deploy the Enhanced System

### Option A: Simple Deployment (Recommended)
```powershell
# Run the simple deployment script
.\deploy-simple.ps1
```

### Option B: Full Deployment
```powershell
# Run the full deployment script (includes monitoring)
.\deploy-local.ps1
```

### Option C: Manual Commands
```powershell
# 1. Create directories
mkdir -p data, uploads, logs, memories, output

# 2. Start essential services
docker-compose -f docker-compose.enhanced.yml up -d postgres redis backend frontend

# 3. Check status
docker-compose -f docker-compose.enhanced.yml ps
```

## Step 3: Access Your Enhanced System

Once deployment is complete, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Main React application with new integration layer |
| **Backend API** | http://localhost:8000 | FastAPI backend with v1 endpoints |
| **API Health** | http://localhost:8000/api/v1/health | Check API status |
| **GraphQL Playground** | http://localhost:8000/api/v1/graphql/playground | Interactive GraphQL interface |

## Step 4: Test the New Features

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

### 3. Test Frontend Integration
Visit: http://localhost:5173
- Navigate between sections
- Check for real-time updates
- Verify connected components

## Troubleshooting

### If Docker is still not ready:
1. Wait a few more minutes for Docker Desktop to fully start
2. Check the Docker Desktop icon in the system tray
3. Try running `docker ps` to test connectivity

### If services don't start:
```powershell
# Check logs
docker-compose -f docker-compose.enhanced.yml logs -f

# Restart services
docker-compose -f docker-compose.enhanced.yml restart
```

### If ports are in use:
```powershell
# Check what's using the ports
netstat -ano | findstr :8000
netstat -ano | findstr :5173

# Stop conflicting services
docker-compose -f docker-compose.enhanced.yml down
```

## Success Indicators

✅ **Docker Desktop is running**  
✅ **All containers are running**  
✅ **Frontend loads at http://localhost:5173**  
✅ **API responds at http://localhost:8000/api/v1/health**  
✅ **GraphQL playground works**  
✅ **Components are connected (no isolation)**  

## Next Steps

1. **Test the GraphQL Playground** to see the new API capabilities
2. **Explore the frontend** to see the connected components
3. **Check the integration layer** in the browser console
4. **Test real-time features** by making changes in different sections

---

**Ready to proceed?** Once Docker Desktop is fully ready, run `.\deploy-simple.ps1` to get started!
