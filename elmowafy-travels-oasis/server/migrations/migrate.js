import { fileURLToPath } from 'url';
import path from 'path';
import { Umzug } from 'umzug';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the migrations table exists
async function ensureMigrationsTable() {
  try {
    // Check if migrations table exists
    const [results] = await db.sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      )`
    );
    
    const tableExists = results[0].exists;
    
    if (!tableExists) {
      console.log('🔄 Creating migrations table...');
      await db.sequelize.query(`
        CREATE TABLE migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Migrations table created');
    } else {
      console.log('✅ Migrations table exists');
    }
  } catch (error) {
    console.error('❌ Error ensuring migrations table:', error);
    throw error;
  }
}

async function runMigrations() {
  try {
    // Initialize database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established.');
    
    // Create migrations table if it doesn't exist
    await ensureMigrationsTable();
    
    // Initialize models
    console.log('🔄 Initializing database models...');
    await db.initModels();
    console.log('✅ Database models initialized');
    
    // Get the query interface
    const queryInterface = db.sequelize.getQueryInterface();
    
    // Create a new Umzug instance
    const umzug = new Umzug({
      migrations: {
        glob: ['migrations/scripts/*.js', { cwd: __dirname }],
        resolve: ({ name, path }) => {
          // Get migration function
          const migration = import(path);
          return {
            name,
            up: async () => (await migration).up(queryInterface, db.sequelize.Sequelize),
            down: async () => (await migration).down(queryInterface, db.sequelize.Sequelize),
          };
        },
      },
      context: queryInterface,
      storage: {
        async executed() {
          const [results] = await db.sequelize.query(
            'SELECT name FROM migrations',
            { type: db.sequelize.QueryTypes.SELECT }
          );
          return results.map(r => r.name);
        },
        async logMigration({ name }) {
          await db.sequelize.query(
            'INSERT INTO migrations (name) VALUES (?)',
            { replacements: [name] }
          );
        },
        async unlogMigration({ name }) {
          await db.sequelize.query(
            'DELETE FROM migrations WHERE name = ?',
            { replacements: [name] }
          );
        },
      },
      logger: {
        info: (msg) => console.log(`[INFO] ${msg}`),
        warn: (msg) => console.warn(`[WARN] ${msg}`),
        error: (msg) => console.error(`[ERROR] ${msg}`),
        debug: (msg) => console.debug(`[DEBUG] ${msg}`)
      },
    });

    // Check command line arguments
    const command = process.argv[2] || 'up';

    switch (command) {
      case 'up':
        await umzug.up();
        console.log('✅ All migrations executed successfully');
        break;
      case 'down':
        await umzug.down();
        console.log('✅ Last migration reverted successfully');
        break;
      case 'status':
        const executed = await umzug.executed();
        const pending = await umzug.pending();
        
        console.log('\n=== Migration Status ===');
        console.log('Executed migrations:', executed.length);
        console.log('Pending migrations:', pending.length);
        
        if (pending.length > 0) {
          console.log('\nPending migrations:');
          pending.forEach(m => console.log(`- ${m.name}`));
        }
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Available commands: up, down, status');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

// Create migrations table if it doesn't exist
async function ensureMigrationsTable() {
  try {
    await db.sequelize.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (error) {
    console.error('❌ Failed to create migrations table:', error);
    process.exit(1);
  }
}

// Run the migrations
async function main() {
  await ensureMigrationsTable();
  await runMigrations();
}

main();
