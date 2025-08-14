# 🐳 Docker Deployment Guide

This guide will help you deploy the complete Elmowafiplatform using Docker Desktop.

## 🚀 Quick Start

### Prerequisites
- **Docker Desktop** installed and running
- **Git** (if cloning the repository)
- At least **4GB RAM** available for containers

### One-Click Deployment

#### On Windows:
```bash
# Double-click or run in Command Prompt
deploy-docker.bat
```

#### On Linux/Mac:
```bash
# Run in Terminal
./deploy-docker.sh
```

## 📋 Manual Deployment

If you prefer to run commands manually:

```bash
# 1. Stop any existing containers
docker-compose down

# 2. Build the containers
docker-compose build

# 3. Start all services
docker-compose up -d

# 4. Check status
docker-compose ps
```

## 🌐 Access Points

Once deployed, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| 📱 **Frontend** | http://localhost:5173 | React application with Family AI |
| 🔧 **Backend API** | http://localhost:8000 | FastAPI backend |
| 📊 **Health Check** | http://localhost:8000/api/v1/health | API status |
| 🎯 **Family AI Demo** | http://localhost:5173/family-ai-demo | AI Chat Demo |
| 💾 **Redis** | localhost:6379 | Cache (internal use) |

## 🧪 Testing the Family AI Integration

1. **Open the Frontend**: http://localhost:5173
2. **Navigate to AI Demo**: Click on "Family AI Demo" or go to `/family-ai-demo`
3. **Test Different Personalities**:
   - 🧳 **Ahmed** (Travel Guide) - Ask about Dubai or travel plans
   - 💝 **Fatima** (Memory Keeper) - Ask about photos or memories  
   - 🎮 **Omar** (Game Master) - Ask about games or activities
   - 📋 **Layla** (Family Organizer) - Ask about planning or organization

## 📊 Container Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Redis         │
│   (React)       │    │   (FastAPI)     │    │   (Cache)       │
│   Port: 5173    │◄──►│   Port: 8000    │◄──►│   Port: 6379    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Development Commands

```bash
# View logs from all services
docker-compose logs -f

# View logs from specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Rebuild containers (after code changes)
docker-compose build --no-cache

# Access container shell
docker exec -it elmowafiplatform-backend bash
docker exec -it elmowafiplatform-frontend sh
```

## 🔧 Configuration

### Environment Variables

**Backend (`docker-compose.yml`)**:
- `ENVIRONMENT=development`
- `DATABASE_URL=sqlite:///./data/family_platform.db`
- `REDIS_HOST=redis`
- `AI_SERVICES_ENABLED=true`

**Frontend**:
- `NODE_ENV=development`
- `VITE_API_URL=http://backend:8000` (container network)
- `VITE_API_URL_EXTERNAL=http://localhost:8000` (external access)

### Volumes
- `./data:/app/data` - Database and persistent data
- `./uploads:/app/uploads` - File uploads
- `./logs:/app/logs` - Application logs
- `redis_data` - Redis cache data

## 🐛 Troubleshooting

### Common Issues:

1. **Port Already in Use**:
   ```bash
   # Stop conflicting processes
   netstat -ano | findstr :5173
   netstat -ano | findstr :8000
   # Kill the process ID if needed
   ```

2. **Docker Desktop Not Running**:
   - Start Docker Desktop application
   - Wait for it to fully initialize

3. **Build Failures**:
   ```bash
   # Clean rebuild
   docker-compose down -v
   docker-compose build --no-cache
   ```

4. **Frontend Can't Connect to Backend**:
   - Check if backend is healthy: http://localhost:8000/api/v1/health
   - Verify container networking: `docker-compose ps`

### Health Checks

```bash
# Check all services are running
docker-compose ps

# Test backend health
curl http://localhost:8000/api/v1/health

# Test frontend
curl http://localhost:5173

# Check container logs
docker-compose logs backend
docker-compose logs frontend
```

## 🎯 Features Included

### ✅ Backend Features:
- FastAPI with all family management endpoints
- Family AI chat endpoints
- File upload and processing
- Health checks and monitoring
- SQLite database with sample data

### ✅ Frontend Features:
- React 18 with TypeScript
- Family AI Chat with 4 personalities
- 3D World Map visualization
- Memory management system
- Travel planning interface
- Gaming system integration

### ✅ AI Integration:
- 4 distinct AI personalities
- Context-aware responses
- Demo mode for immediate testing
- Real-time chat interface
- Family context management

## 📈 Production Deployment

For production deployment:

1. Update environment variables
2. Use production Docker images
3. Configure proper secrets management
4. Set up proper logging
5. Configure load balancing if needed

## 🤝 Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify all containers are running: `docker-compose ps`
3. Test individual services using the URLs above
4. Check Docker Desktop status

Happy coding! 🎉