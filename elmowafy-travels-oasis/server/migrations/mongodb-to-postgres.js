/**
 * MongoDB to PostgreSQL Migration Script
 * 
 * This script migrates data from MongoDB to PostgreSQL for the elmowafy-travels-oasis server component.
 * It handles the migration of User, FamilyMember, Trip, and Memory models.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../config.env') });

// Import MongoDB models
import User from '../models/User.js';
import FamilyMember from '../models/FamilyMember.js';
import Trip from '../models/Trip.js';
import Memory from '../models/Memory.js';

// Import Sequelize models
import db from '../config/database.js';
const { sequelize } = db;

// Initialize logger
const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(path.join(__dirname, 'migration.log'), logMessage);
  console.log(message);
};

// Connect to MongoDB
const connectMongoDB = async () => {
  try {
    const DB = process.env.DATABASE.replace(
      '<PASSWORD>',
      process.env.DATABASE_PASSWORD
    );
    
    await mongoose.connect(DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logToFile('MongoDB connection established');
    return true;
  } catch (error) {
    logToFile(`MongoDB connection failed: ${error.message}`);
    return false;
  }
};

// Initialize Sequelize models
const initSequelizeModels = async () => {
  try {
    await db.initModels();
    logToFile('Sequelize models initialized');
    return true;
  } catch (error) {
    logToFile(`Sequelize models initialization failed: ${error.message}`);
    return false;
  }
};

// Migration functions
const migrateUsers = async () => {
  try {
    const users = await User.find({});
    logToFile(`Found ${users.length} users in MongoDB`);
    
    let migratedCount = 0;
    
    for (const mongoUser of users) {
      try {
        // Check if user already exists in PostgreSQL
        const existingUser = await db.models.User.findOne({
          where: { email: mongoUser.email }
        });
        
        if (!existingUser) {
          // Create new user in PostgreSQL
          await db.models.User.create({
            email: mongoUser.email,
            username: mongoUser.email.split('@')[0],
            display_name: mongoUser.name,
            avatar_url: mongoUser.photo,
            password_hash: mongoUser.password, // Note: This should be properly hashed
            is_active: mongoUser.active,
            created_at: mongoUser.createdAt,
            updated_at: mongoUser.updatedAt
          });
          migratedCount++;
        }
      } catch (error) {
        logToFile(`Error migrating user ${mongoUser.email}: ${error.message}`);
      }
    }
    
    logToFile(`Successfully migrated ${migratedCount} users to PostgreSQL`);
    return migratedCount;
  } catch (error) {
    logToFile(`User migration failed: ${error.message}`);
    return 0;
  }
};

const migrateFamilyMembers = async () => {
  try {
    const familyMembers = await FamilyMember.find({});
    logToFile(`Found ${familyMembers.length} family members in MongoDB`);
    
    let migratedCount = 0;
    
    // Create a default family group if it doesn't exist
    let defaultFamilyGroup = await db.models.FamilyGroup.findOne({
      where: { name: 'Default Family' }
    });
    
    if (!defaultFamilyGroup) {
      defaultFamilyGroup = await db.models.FamilyGroup.create({
        name: 'Default Family',
        description: 'Default family group created during migration',
        created_at: new Date(),
        updated_at: new Date()
      });
      logToFile('Created default family group');
    }
    
    for (const mongoFamilyMember of familyMembers) {
      try {
        // Find associated user if exists
        let userId = null;
        if (mongoFamilyMember.user) {
          const user = await db.models.User.findOne({
            where: { email: mongoFamilyMember.user.email }
          });
          if (user) userId = user.id;
        }
        
        // Check if family member already exists
        const existingMember = await db.models.FamilyMember.findOne({
          where: { name: mongoFamilyMember.name }
        });
        
        if (!existingMember) {
          // Create new family member in PostgreSQL
          await db.models.FamilyMember.create({
            user_id: userId,
            family_group_id: defaultFamilyGroup.id,
            name: mongoFamilyMember.name,
            name_arabic: mongoFamilyMember.arabicName,
            birth_date: mongoFamilyMember.birthDate,
            location: mongoFamilyMember.location,
            avatar: mongoFamilyMember.profilePicture,
            role: 'member',
            is_active: mongoFamilyMember.isActive !== false,
            created_at: mongoFamilyMember.createdAt,
            updated_at: mongoFamilyMember.updatedAt
          });
          migratedCount++;
        }
      } catch (error) {
        logToFile(`Error migrating family member ${mongoFamilyMember.name}: ${error.message}`);
      }
    }
    
    logToFile(`Successfully migrated ${migratedCount} family members to PostgreSQL`);
    return migratedCount;
  } catch (error) {
    logToFile(`Family member migration failed: ${error.message}`);
    return 0;
  }
};

const migrateTrips = async () => {
  try {
    const trips = await Trip.find({});
    logToFile(`Found ${trips.length} trips in MongoDB`);
    
    let migratedCount = 0;
    
    // Get default family group
    const defaultFamilyGroup = await db.models.FamilyGroup.findOne({
      where: { name: 'Default Family' }
    });
    
    if (!defaultFamilyGroup) {
      logToFile('Default family group not found, cannot migrate trips');
      return 0;
    }
    
    for (const mongoTrip of trips) {
      try {
        // Find associated user
        let userId = null;
        if (mongoTrip.createdBy) {
          const user = await db.models.User.findOne({
            where: { email: mongoTrip.createdBy.email }
          });
          if (user) userId = user.id;
        }
        
        // Check if trip already exists
        const existingTrip = await db.models.TravelPlan.findOne({
          where: { destination: mongoTrip.destination.primary.name }
        });
        
        if (!existingTrip) {
          // Create new travel plan in PostgreSQL
          const travelPlan = await db.models.TravelPlan.create({
            user_id: userId,
            family_group_id: defaultFamilyGroup.id,
            destination: mongoTrip.destination.primary.name,
            start_date: mongoTrip.startDate,
            end_date: mongoTrip.endDate,
            budget: mongoTrip.budget?.total || 0,
            status: mapTripStatus(mongoTrip.status),
            notes: mongoTrip.description,
            created_at: mongoTrip.createdAt,
            updated_at: mongoTrip.updatedAt
          });
          
          // Migrate trip preferences
          if (mongoTrip.preferences) {
            for (const [key, value] of Object.entries(mongoTrip.preferences)) {
              await db.models.TravelPreference.create({
                travel_plan_id: travelPlan.id,
                preference_type: mapPreferenceType(key),
                name: key,
                value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                created_at: mongoTrip.createdAt,
                updated_at: mongoTrip.updatedAt
              });
            }
          }
          
          migratedCount++;
        }
      } catch (error) {
        logToFile(`Error migrating trip ${mongoTrip.title}: ${error.message}`);
      }
    }
    
    logToFile(`Successfully migrated ${migratedCount} trips to PostgreSQL`);
    return migratedCount;
  } catch (error) {
    logToFile(`Trip migration failed: ${error.message}`);
    return 0;
  }
};

const migrateMemories = async () => {
  try {
    const memories = await Memory.find({});
    logToFile(`Found ${memories.length} memories in MongoDB`);
    
    // Since the main backend handles memories differently, we'll log this information
    // but won't actually migrate the data as it would require a custom approach
    // to integrate with the main backend's memory system
    
    logToFile(`Memory migration requires integration with main backend's memory system.`);
    logToFile(`Please use the main backend's database_migrations.py script to handle memory migration.`);
    
    return 0;
  } catch (error) {
    logToFile(`Memory migration check failed: ${error.message}`);
    return 0;
  }
};

// Helper functions
const mapTripStatus = (mongoStatus) => {
  const statusMap = {
    'planning': 'planning',
    'confirmed': 'booked',
    'active': 'in_progress',
    'completed': 'completed',
    'cancelled': 'cancelled'
  };
  
  return statusMap[mongoStatus] || 'planning';
};

const mapPreferenceType = (key) => {
  const typeMap = {
    'accommodation': 'accommodation',
    'activity': 'activity',
    'food': 'dietary',
    'accessibility': 'accessibility'
  };
  
  return typeMap[key] || 'other';
};

// Main migration function
const runMigration = async () => {
  logToFile('Starting MongoDB to PostgreSQL migration...');
  
  // Connect to databases
  const mongoConnected = await connectMongoDB();
  if (!mongoConnected) {
    logToFile('Migration aborted: Could not connect to MongoDB');
    return;
  }
  
  const modelsInitialized = await initSequelizeModels();
  if (!modelsInitialized) {
    logToFile('Migration aborted: Could not initialize Sequelize models');
    return;
  }
  
  try {
    // Run migrations in sequence
    await migrateUsers();
    await migrateFamilyMembers();
    await migrateTrips();
    await migrateMemories();
    
    logToFile('Migration completed successfully!');
  } catch (error) {
    logToFile(`Migration failed: ${error.message}`);
  } finally {
    // Close connections
    await mongoose.connection.close();
    await sequelize.close();
    logToFile('Database connections closed');
  }
};

// Run migration if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigration().catch(error => {
    logToFile(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
}

export default runMigration;