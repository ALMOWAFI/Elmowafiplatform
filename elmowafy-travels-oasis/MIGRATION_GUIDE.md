# MongoDB to PostgreSQL Migration Guide

## Overview

This guide documents the process of migrating data from MongoDB to PostgreSQL for the Elmowafy Travels Oasis platform. The migration is necessary to unify the database architecture and integrate the Node.js server component with the Python AI backend.

## Migration Components

### 1. MongoDB to PostgreSQL Migration Script

The migration script (`server/migrations/mongodb-to-postgres.js`) handles the transfer of data from MongoDB collections to PostgreSQL tables. It includes:

- User migration (MongoDB User → PostgreSQL User)
- Family member migration (MongoDB FamilyMember → PostgreSQL FamilyMember)
- Trip migration (MongoDB Trip → PostgreSQL TravelPlan)
- Memory migration (handled separately through the Python backend)

### 2. Unified API Service

The unified API service (`client/src/services/api.js`) provides a consistent interface for the frontend to communicate with both:

- Node.js server (for legacy functionality)
- Python AI backend (for AI-enhanced features)

## Running the Migration

### Prerequisites

- Both MongoDB and PostgreSQL databases must be running and accessible
- Environment variables must be properly configured in `config.env`
- Node.js and npm must be installed

### Migration Steps

1. **Backup your MongoDB data**

   ```bash
   mongodump --uri="<your-mongodb-uri>" --out=./backup
   ```

2. **Run the migration script**

   ```bash
   cd server
   node migrations/mongodb-to-postgres.js
   ```

3. **Verify the migration**

   Check the migration logs in `server/migrations/migration.log` for any errors or warnings.

## API Integration

### Frontend Configuration

Update your environment variables to include both API endpoints:

```
# .env.local (for development)
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_AI_SERVICE_URL=http://localhost:8000/api
```

### Using the Unified API Service

Import the API service in your React components:

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

## Architecture Overview

### Database Architecture

- **PostgreSQL**: Primary database for all structured data
  - Users, Family Members, Travel Plans, etc.
- **MongoDB**: Legacy database (being migrated away from)

### API Architecture

- **Node.js Server**: Handles legacy API endpoints (port 3000)
  - User authentication
  - Basic CRUD operations
- **Python FastAPI Backend**: Handles AI-enhanced features (port 8000)
  - Family AI context and chat
  - Travel recommendations
  - Memory insights

## Troubleshooting

### Common Migration Issues

- **Connection errors**: Ensure both database connections are properly configured in environment variables
- **Schema mismatches**: Check the migration script for any field mapping issues
- **Missing data**: Verify that all required fields are being migrated correctly

### API Integration Issues

- **CORS errors**: Ensure CORS is properly configured on both backends
- **Authentication failures**: Verify that the token is being properly passed to both services
- **404 errors**: Check that the API endpoints match what's expected by the frontend

## Next Steps

1. Complete the migration of all data
2. Update frontend components to use the unified API service
3. Phase out direct MongoDB connections in the Node.js server
4. Implement comprehensive testing of the integrated system