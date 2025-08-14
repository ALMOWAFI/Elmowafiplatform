import { DataTypes } from 'sequelize';
import db from '../config/database.js';
const { sequelize } = db;

const Memory = sequelize.define('Memory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [1, 255],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'image_url',
  },
  image_filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'image_filename',
  },
  memory_type: {
    type: DataTypes.ENUM('travel', 'family_gathering', 'daily_life', 'celebration', 'education', 'other'),
    defaultValue: 'other',
    field: 'memory_type',
  },
  memory_date: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'memory_date',
  },
  location: {
    type: DataTypes.JSONB, // Store location data as JSON
    allowNull: true,
    defaultValue: {},
  },
  ai_analysis: {
    type: DataTypes.JSONB, // Store AI analysis results
    allowNull: true,
    defaultValue: {},
    field: 'ai_analysis',
  },
  family_members: {
    type: DataTypes.JSONB, // Store detected family members
    allowNull: true,
    defaultValue: [],
    field: 'family_members',
  },
  tags: {
    type: DataTypes.JSONB, // Store tags and keywords
    allowNull: true,
    defaultValue: [],
  },
  is_favorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_favorite',
  },
  privacy_level: {
    type: DataTypes.ENUM('private', 'family', 'public'),
    defaultValue: 'family',
    field: 'privacy_level',
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    field: 'user_id',
  },
}, {
  tableName: 'memories',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id'],
    },
    {
      fields: ['memory_type'],
    },
    {
      fields: ['memory_date'],
    },
    {
      fields: ['created_at'],
    },
  ],
});

export default Memory;