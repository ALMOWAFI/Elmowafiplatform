# 🚀 Quick Start Guide - Enhanced Elmowafiplatform

## Prerequisites

1. **Docker Desktop** - Make sure Docker Desktop is running
2. **Git** - To clone or update the repository
3. **PowerShell** (Windows) or **Terminal** (Mac/Linux)

## 🎯 Quick Deployment

### Option 1: Windows (PowerShell)
```powershell
# Run the deployment script
.\deploy-local.ps1
```

### Option 2: Linux/Mac (Terminal)
```bash
# Make script executable (if needed)
chmod +x deploy-local.sh

# Run the deployment script
./deploy-local.sh
```

### Option 3: Manual Docker Compose
```bash
# Build and start all services
docker-compose -f docker-compose.enhanced.yml up --build -d
```

## 🌐 Access Your Enhanced System

Once deployment is complete, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Main React application with new integration layer |
| **Backend API** | http://localhost:8000 | FastAPI backend with v1 endpoints |
| **API Health** | http://localhost:8000/api/v1/health | Check API status |
| **GraphQL Playground** | http://localhost:8000/api/v1/graphql/playground | Interactive GraphQL interface |
| **Service Mesh** | http://localhost:8000/api/v1/service-mesh/status | Service mesh monitoring |
| **Consul UI** | http://localhost:8500 | Service discovery and configuration |
| **Prometheus** | http://localhost:9090 | Metrics and monitoring |
| **Grafana** | http://localhost:3000 | Dashboard visualization (admin/admin) |
| **Nginx Proxy** | http://localhost:80 | Production-like reverse proxy |

## 🔍 What's New in This Enhanced Version

### 1. **API Versioning** (`/api/v1/`)
- All endpoints now use versioned URLs
- Backward compatibility maintained
- Clean separation of API versions

### 2. **GraphQL Support**
- Interactive playground at `/api/v1/graphql/playground`
- Efficient data fetching
- Real-time subscriptions

### 3. **Service Mesh Architecture**
- Service discovery with Consul
- Load balancing and circuit breakers
- Health monitoring and metrics

### 4. **Integration Layer** (Frontend)
- **DataContext**: Centralized state management
- **IntegrationContext**: Real-time WebSocket communication
- **Connected Components**: No more component isolation
- **Event Broadcasting**: Cross-component communication

### 5. **Enhanced Security**
- JWT authentication for WebSockets
- Rate limiting and authorization
- Secure headers and CORS

### 6. **Performance Optimization**
- Intelligent caching
- Database optimization
- Memory management
- Async task control

### 7. **Monitoring & Observability**
- Prometheus metrics collection
- Grafana dashboards
- Real-time health checks
- Performance monitoring

## 🧪 Testing the New Features

### 1. **Test API Versioning**
```bash
# Check v1 health endpoint
curl http://localhost:8000/api/v1/health

# Compare with legacy endpoint
curl http://localhost:8000/health
```

### 2. **Test GraphQL**
1. Open http://localhost:8000/api/v1/graphql/playground
2. Try this query:
```graphql
query {
  familyMembers {
    id
    name
    email
  }
  health {
    status
    timestamp
  }
}
```

### 3. **Test Service Mesh**
```bash
# Check service mesh status
curl http://localhost:8000/api/v1/service-mesh/status

# List registered services
curl http://localhost:8000/api/v1/service-mesh/services
```

### 4. **Test Frontend Integration**
1. Open http://localhost:5173
2. Navigate to different sections
3. Notice real-time updates and connected components
4. Check the browser console for WebSocket connections

### 5. **Test Monitoring**
1. Open http://localhost:3000 (Grafana)
2. Login with admin/admin
3. View system metrics and dashboards

## 🔧 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Check what's using the port
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Mac/Linux

# Stop conflicting services
docker-compose -f docker-compose.enhanced.yml down
```

**2. Docker Build Fails**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose -f docker-compose.enhanced.yml build --no-cache
```

**3. Services Not Starting**
```bash
# Check logs
docker-compose -f docker-compose.enhanced.yml logs -f

# Check specific service
docker-compose -f docker-compose.enhanced.yml logs backend
```

**4. Database Connection Issues**
```bash
# Wait for PostgreSQL to be ready
docker-compose -f docker-compose.enhanced.yml logs postgres

# Restart database
docker-compose -f docker-compose.enhanced.yml restart postgres
```

### Useful Commands

```bash
# View all running containers
docker-compose -f docker-compose.enhanced.yml ps

# View logs for all services
docker-compose -f docker-compose.enhanced.yml logs -f

# Stop all services
docker-compose -f docker-compose.enhanced.yml down

# Restart specific service
docker-compose -f docker-compose.enhanced.yml restart backend

# Access container shell
docker exec -it elmowafiplatform-backend-enhanced bash
```

## 📊 Monitoring Your System

### Real-time Metrics
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)

### Key Metrics to Watch
- API response times
- WebSocket connection count
- Database query performance
- Memory usage
- CPU utilization

### Health Checks
- Backend: http://localhost:8000/api/v1/health
- Service Mesh: http://localhost:8000/api/v1/service-mesh/status
- Consul: http://localhost:8500

## 🎉 Success Criteria

Your enhanced system is working correctly if:

✅ **Frontend loads** at http://localhost:5173  
✅ **API responds** at http://localhost:8000/api/v1/health  
✅ **GraphQL playground** works at http://localhost:8000/api/v1/graphql/playground  
✅ **Service mesh** shows status at http://localhost:8000/api/v1/service-mesh/status  
✅ **Components are connected** (no isolation) in the frontend  
✅ **Real-time updates** work via WebSockets  
✅ **Monitoring dashboards** are accessible  

## 🚀 Next Steps

1. **Explore the GraphQL Playground** to test queries
2. **Check the Service Mesh** to see service discovery
3. **Monitor performance** in Grafana
4. **Test real-time features** in the frontend
5. **Review the integration layer** code in the frontend

---

**Need Help?** Check the logs or refer to the detailed documentation in:
- `API_ENHANCEMENTS.md`
- `INTEGRATION_LAYER_SOLUTION.md`
- `DEPLOYMENT_GUIDE.md`
