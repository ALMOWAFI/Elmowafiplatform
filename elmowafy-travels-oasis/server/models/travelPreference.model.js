import { DataTypes } from 'sequelize';
import db from '../config/database.js';
const { sequelize } = db;

const TravelPreference = sequelize.define('TravelPreference', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  travelPlanId: {
    type: DataTypes.UUID,
    field: 'travel_plan_id',
    references: {
      model: 'travel_plans',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  preferenceType: {
    type: DataTypes.ENUM('accommodation', 'activity', 'dietary', 'accessibility', 'other'),
    field: 'preference_type',
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  value: {
    type: DataTypes.TEXT,
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'travel_preferences',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  // Composite index for travel_plan_id and preference_type
  indexes: [
    {
      fields: ['travel_plan_id', 'preference_type'],
    },
  ],
});

export default TravelPreference;
