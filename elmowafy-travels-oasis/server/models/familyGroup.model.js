import { DataTypes } from 'sequelize';
import db from '../config/database.js';
const { sequelize } = db;

const FamilyGroup = sequelize.define('FamilyGroup', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.UUID,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'family_groups',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default FamilyGroup;
