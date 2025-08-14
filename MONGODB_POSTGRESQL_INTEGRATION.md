# MongoDB to PostgreSQL Integration Guide

## Overview

This document provides a comprehensive guide for integrating the MongoDB database from the Node.js server component with the PostgreSQL database used by the Python FastAPI backend. This integration is part of a migration strategy to unify the database architecture of the Elmowafy Travels Oasis platform.

## Architecture

### Current Architecture

- **Node.js Server (Port 3000)**
  - Uses MongoDB for data storage
  - Handles user authentication, family members, trips, and memories

- **Python FastAPI Backend (Port 8000)**
  - Uses PostgreSQL for data storage
  - Provides AI-enhanced features and analytics

### Target Architecture

- **Unified Backend**
  - Primary database: PostgreSQL
  - Legacy data migrated from MongoDB
  - Consistent API endpoints for all features

## Integration Components

The integration consists of the following components:

1. **MongoDB to PostgreSQL Migration Script**
   - Located at: `elmowafy-travels-oasis/server/migrations/mongodb-to-postgres.js`
   - Migrates data from MongoDB collections to PostgreSQL tables

2. **Database Bridge**
   - Located at: `elmowafy-travels-oasis/backend/database_bridge.py`
   - Provides a unified interface to access data from both databases during migration

3. **MongoDB Integration Endpoints**
   - Located at: `elmowafy-travels-oasis/backend/mongodb_integration.py`
   - FastAPI endpoints to access MongoDB data through the database bridge

4. **Unified API Service**
   - Located at: `elmowafy-travels-oasis/client/src/services/api.js`
   - Provides a consistent interface for the frontend to communicate with both backends

5. **Main Backend Integration**
   - Script: `update_main_backend.py`
   - Updates the main backend to include the MongoDB integration

## Migration Process

### Step 1: Run the MongoDB to PostgreSQL Migration Script

```bash
cd elmowafy-travels-oasis/server
node migrations/mongodb-to-postgres.js
```

This script will:
- Connect to both MongoDB and PostgreSQL databases
- Migrate users, family members, trips, and memories
- Log the migration process to `migration.log`

### Step 2: Update the Main Backend

```bash
python update_main_backend.py
```

This script will:
- Create a backup of the main backend's `main.py` file
- Add the MongoDB integration imports and router

### Step 3: Start the Integrated Backend

```bash
cd backend
python main.py
```

### Step 4: Test the API Integration

```bash
node elmowafy-travels-oasis/test-api-integration.js
```

This script will:
- Test the health of both backends
- Verify authentication works across both systems
- Test cross-database queries

## API Endpoints

### MongoDB Bridge Endpoints

- **GET /api/mongodb-bridge/health**
  - Health check endpoint

- **GET /api/mongodb-bridge/users/{email}**
  - Get user by email from either database

- **GET /api/mongodb-bridge/family-members/{member_id}**
  - Get family member by ID from either database

- **GET /api/mongodb-bridge/family-members**
  - Get all family members from either database

- **GET /api/mongodb-bridge/travel-plans/{plan_id}**
  - Get travel plan by ID from either database

- **GET /api/mongodb-bridge/travel-plans**
  - Get all travel plans from either database

- **GET /api/mongodb-bridge/memories/{memory_id}**
  - Get memory by ID from either database

- **GET /api/mongodb-bridge/memories**
  - Get all memories from either database

- **POST /api/mongodb-bridge/users**
  - Create a new user in PostgreSQL

- **POST /api/mongodb-bridge/family-members**
  - Create a new family member in PostgreSQL

- **POST /api/mongodb-bridge/travel-plans**
  - Create a new travel plan in PostgreSQL

- **POST /api/mongodb-bridge/memories**
  - Create a new memory in PostgreSQL

## Frontend Integration

The frontend uses a unified API service to communicate with both backends:

```javascript
import apiService from '../services/api';

// Example: Fetch family members from Node.js server
const fetchFamilyMembers = async () => {
  try {
    const response = await apiService.familyMembers.getAll();
    setFamilyMembers(response.data.data);
  } catch (error) {
    console.error('Error fetching family members:', error);
  }
};

// Example: Get AI-powered recommendations from Python backend
const getFamilyRecommendations = async (familyId) => {
  try {
    const response = await apiService.familyAi.getTravelRecommendations(familyId, preferences);
    setRecommendations(response.data.recommendations);
  } catch (error) {
    console.error('Error getting recommendations:', error);
  }
};
```

## Environment Configuration

Update your environment variables to include both API endpoints:

```
# .env.local (for development)
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_AI_SERVICE_URL=http://localhost:8000/api
MONGODB_URI=mongodb://localhost:27017/elmowafy
POSTGRES_URI=postgresql://user:password@localhost:5432/elmowafy
```

## Troubleshooting

### Common Issues

1. **Connection errors**
   - Ensure both databases are running and accessible
   - Check environment variables for correct connection strings

2. **Schema mismatches**
   - Check the migration script for any field mapping issues
   - Verify that all required fields are being migrated correctly

3. **API integration issues**
   - Ensure CORS is properly configured on both backends
   - Verify that authentication tokens are being properly passed

### Logs

- Migration logs: `elmowafy-travels-oasis/server/migrations/migration.log`
- API integration test logs: `api-integration-test.log`
- Backend logs: Check the console output of the running backend services

## Next Steps

1. Complete the migration of all data
2. Update frontend components to use the unified API service
3. Phase out direct MongoDB connections in the Node.js server
4. Implement comprehensive testing of the integrated system
5. Deploy the unified system to production

## References

- [MongoDB Documentation](https://docs.mongodb.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Sequelize Documentation](https://sequelize.org/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)