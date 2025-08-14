import { DataTypes } from 'sequelize';
import db from '../config/database.js';
const { sequelize } = db;
import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100],
    },
  },
  role: {
    type: DataTypes.ENUM('admin', 'user', 'family_member'),
    defaultValue: 'user',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  lastLogin: {
    type: DataTypes.DATE,
    field: 'last_login',
  },
  // Timestamps are handled by the timestamps option below
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Instance method to check password
User.prototype.validPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

export default User;
