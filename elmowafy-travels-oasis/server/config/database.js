import { Sequelize } from 'sequelize';
import Redis from 'ioredis';

// Initialize Sequelize with environment variables
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'elmowafy',
  process.env.POSTGRES_USER || 'elmowafy',
  process.env.POSTGRES_PASSWORD || 'your_secure_password_here',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Initialize models
const db = {
  sequelize,
  redis,
  // These will be populated when initModels is called
  models: {},
  
  // Initialize models and set up associations
  initModels: async function() {
    try {
      console.log('🔄 Initializing models...');
      
      // Import models here to avoid circular dependencies
      const User = (await import('../models/user.model.js')).default;
      const FamilyGroup = (await import('../models/familyGroup.model.js')).default;
      const FamilyMember = (await import('../models/familyMember.model.js')).default;
      const TravelPlan = (await import('../models/travelPlan.model.js')).default;
      const TravelPreference = (await import('../models/travelPreference.model.js')).default;
      
      // Store models in db object
      this.models = {
        User,
        FamilyGroup,
        FamilyMember,
        TravelPlan,
        TravelPreference
      };
      
      console.log('✅ Models initialized successfully');
      
      // Set up associations
      this.setupAssociations();
      
      return this.models;
    } catch (error) {
      console.error('❌ Error initializing models:', error);
      throw error;
    }
  },
  
  // Set up model associations
  setupAssociations: function() {
    const { User, FamilyGroup, FamilyMember, TravelPlan, TravelPreference } = this.models;
    
    // User has many FamilyGroups (as creator)
    User.hasMany(FamilyGroup, {
      foreignKey: 'created_by',
      as: 'createdGroups'
    });
    FamilyGroup.belongsTo(User, {
      foreignKey: 'created_by',
      as: 'creator'
    });

    // User has many FamilyMembers (as family members)
    User.hasMany(FamilyMember, {
      foreignKey: 'user_id',
      as: 'familyMemberships'
    });
    FamilyMember.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // FamilyGroup has many FamilyMembers
    FamilyGroup.hasMany(FamilyMember, {
      foreignKey: 'family_group_id',
      as: 'members'
    });
    FamilyMember.belongsTo(FamilyGroup, {
      foreignKey: 'family_group_id',
      as: 'familyGroup'
    });

    // User has many TravelPlans
    User.hasMany(TravelPlan, {
      foreignKey: 'user_id',
      as: 'travelPlans'
    });
    TravelPlan.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // FamilyGroup has many TravelPlans
    FamilyGroup.hasMany(TravelPlan, {
      foreignKey: 'family_group_id',
      as: 'travelPlans'
    });
    TravelPlan.belongsTo(FamilyGroup, {
      foreignKey: 'family_group_id',
      as: 'familyGroup'
    });

    // TravelPlan has many TravelPreferences
    TravelPlan.hasMany(TravelPreference, {
      foreignKey: 'travel_plan_id',
      as: 'preferences'
    });
    TravelPreference.belongsTo(TravelPlan, {
      foreignKey: 'travel_plan_id',
      as: 'travelPlan'
    });
  },
  
  // Sync database with models
  sync: async (options = {}) => {
    try {
      // Test database connection
      await sequelize.authenticate();
      console.log('✅ PostgreSQL connection has been established successfully.');
      
      // Initialize models and set up associations
      this.initModels();
      
      // Sync all models with database
      await sequelize.sync(options);
      console.log('✅ Database synchronized successfully.');
      
      return true;
    } catch (error) {
      console.error('❌ Database synchronization failed:', error);
      throw error;
    }
  },
  // Test Redis connection
  testRedis: () => {
    return new Promise((resolve, reject) => {
      redis.ping((err, result) => {
        if (err) {
          console.error('❌ Redis connection test failed:', err);
          reject(err);
        } else {
          console.log('✅ Redis connection test successful:', result);
          resolve(result);
        }
      });
    });
  },
  // Close all database connections
  close: async () => {
    try {
      await sequelize.close();
      await redis.quit();
      console.log('✅ Database connections closed.');
    } catch (error) {
      console.error('❌ Error closing database connections:', error);
      throw error;
    }
  }
};

// Test Redis connection
redis.on('connect', () => {
  console.log('✅ Redis client connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

export default db;
