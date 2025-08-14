import { DataTypes } from 'sequelize';
import db from '../config/database.js';
const { sequelize } = db;

const TravelPlan = sequelize.define('TravelPlan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  familyGroupId: {
    type: DataTypes.UUID,
    field: 'family_group_id',
    references: {
      model: 'family_groups',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  destination: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATEONLY,
    field: 'start_date',
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    field: 'end_date',
    allowNull: false,
  },
  budget: {
    type: DataTypes.DECIMAL(10, 2),
  },
  status: {
    type: DataTypes.ENUM('planning', 'booked', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'planning',
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'travel_plans',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default TravelPlan;
