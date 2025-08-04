@echo off
REM Unified Platform Deployment Script for Railway (Windows)
REM Deploys the complete Elmowafiplatform with unified database

echo 🚀 Starting Unified Platform Deployment to Railway
echo ==================================================

REM Check if Railway CLI is installed
railway --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Railway CLI not found. Please install it first:
    echo    npm install -g @railway/cli
    echo    Then run: railway login
    exit /b 1
)

REM Check if user is logged in to Railway
railway whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Not logged in to Railway. Please run:
    echo    railway login
    exit /b 1
)

echo ✅ Railway CLI found and authenticated

REM Check if we're in the right directory
if not exist "Dockerfile" (
    echo ❌ Please run this script from the project root directory
    echo    (where Dockerfile and railway.toml are located)
    exit /b 1
)

if not exist "railway.toml" (
    echo ❌ Please run this script from the project root directory
    echo    (where Dockerfile and railway.toml are located)
    exit /b 1
)

echo ✅ Project structure verified

REM Check required directories
if not exist "elmowafiplatform-api" (
    echo ❌ Required directory not found: elmowafiplatform-api
    exit /b 1
)

if not exist "hack2" (
    echo ❌ Required directory not found: hack2
    exit /b 1
)

if not exist "budget-system" (
    echo ❌ Required directory not found: budget-system
    exit /b 1
)

echo ✅ All required directories found

REM Check if unified database schema exists
if not exist "unified_database_schema.sql" (
    echo ❌ Unified database schema not found: unified_database_schema.sql
    exit /b 1
)

echo ✅ Unified database schema found

REM Check if migration script exists
if not exist "database_migrations.py" (
    echo ❌ Database migration script not found: database_migrations.py
    exit /b 1
)

echo ✅ Database migration script found

REM Create necessary directories
echo 📁 Creating necessary directories...
if not exist "elmowafiplatform-api\data" mkdir "elmowafiplatform-api\data"
if not exist "elmowafiplatform-api\uploads" mkdir "elmowafiplatform-api\uploads"
if not exist "elmowafiplatform-api\logs" mkdir "elmowafiplatform-api\logs"
if not exist "elmowafiplatform-api\face_models" mkdir "elmowafiplatform-api\face_models"
if not exist "elmowafiplatform-api\training_images" mkdir "elmowafiplatform-api\training_images"

REM Copy unified database files to API directory
echo 📋 Copying unified database files...
copy "unified_database_schema.sql" "elmowafiplatform-api\"
copy "database_migrations.py" "elmowafiplatform-api\"

echo ✅ Files copied successfully

REM Deploy to Railway
echo 🚀 Deploying to Railway...
echo    This may take a few minutes...

railway up

if %errorlevel% equ 0 (
    echo.
    echo ✅ Deployment completed!
    echo.
    echo 🎉 Your unified platform is now deployed!
    echo.
    echo 🔗 Your API should now be available at:
    echo    https://your-app-name.railway.app
    echo.
    echo 📊 Check deployment status:
    echo    railway status
    echo.
    echo 📝 View logs:
    echo    railway logs
    echo.
    echo 🔧 Manage your deployment:
    echo    railway dashboard
    echo.
    echo 📚 Read the deployment guide:
    echo    UNIFIED_PLATFORM_SUMMARY.md
    echo.
    echo 🎉 Your unified Elmowafiplatform is now live!
) else (
    echo ❌ Deployment failed. Please check the logs above.
    exit /b 1
) 