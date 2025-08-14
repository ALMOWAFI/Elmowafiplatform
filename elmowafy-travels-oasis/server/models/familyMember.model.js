import { DataTypes } from 'sequelize';
import db from '../config/database.js';
const { sequelize } = db;

const FamilyMember = sequelize.define('FamilyMember', {
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
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name',
  },
  lastName: {
    type: DataTypes.STRING(100),
    field: 'last_name',
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    field: 'date_of_birth',
  },
  relationship: {
    type: DataTypes.STRING(100),
  },
}, {
  tableName: 'family_members',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  // Composite unique constraint for user_id and family_group_id
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'family_group_id'],
    },
  ],
});

export default FamilyMember;
