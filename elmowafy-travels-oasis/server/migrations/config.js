import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    tableName: 'migrations',
  },
  storage: 'sequelize',
  storageOptions: {
    sequelize: db.sequelize,
    tableName: 'migrations',
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
};
