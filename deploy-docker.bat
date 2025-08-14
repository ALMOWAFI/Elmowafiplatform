@echo off
echo ========================================
echo  Elmowafiplatform Docker Deployment
echo ========================================
echo.

echo [1/5] Checking Docker Desktop...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not running
    echo Please install Docker Desktop and make sure it's running
    pause
    exit /b 1
)
echo ✓ Docker is available

echo.
echo [2/5] Stopping any existing containers...
docker-compose down

echo.
echo [3/5] Building containers (this may take a few minutes)...
docker-compose build

echo.
echo [4/5] Starting services...
docker-compose up -d

echo.
echo [5/5] Waiting for services to be ready...
timeout /t 10 /nobreak > nul

echo.
echo ========================================
echo  🚀 Deployment Complete!
echo ========================================
echo.
echo Your Elmowafiplatform is now running:
echo.
echo 📱 Frontend (React): http://localhost:5173
echo 🔧 Backend API:      http://localhost:8000
echo 📊 API Health:       http://localhost:8000/api/v1/health
echo 🎯 Family AI Demo:   http://localhost:5173/family-ai-demo
echo 💾 Redis Cache:      localhost:6379
echo.
echo To view logs: docker-compose logs -f
echo To stop:      docker-compose down
echo.
echo Press any key to open the application in your browser...
pause > nul

echo Opening application...
start http://localhost:5173
start http://localhost:8000/api/v1/health

echo.
echo Happy coding! 🎉