import { fileURLToPath } from 'url';
import path from 'path';
import { Sequelize } from 'sequelize';
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
    
    // Ensure migrations table exists
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
            up: async () => (await migration).up(queryInterface, Sequelize),
            down: async () => (await migration).down(queryInterface, Sequelize),
          };
        },
      },
      context: queryInterface,
      storage: {
        async executed() {
          try {
            const [results] = await db.sequelize.query(
              'SELECT name FROM migrations',
              { type: db.sequelize.QueryTypes.SELECT }
            );
            // Ensure we always return an array, even if results is undefined
            return Array.isArray(results) ? results.map(r => r.name) : [];
          } catch (error) {
            // If the query fails (e.g., table doesn't exist), return empty array
            if (error.name === 'SequelizeDatabaseError' && error.message.includes('relation "migrations" does not exist')) {
              return [];
            }
            throw error;
          }
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
    
    // Execute the command
    switch (command) {
      case 'up':
        console.log('🔼 Running pending migrations...');
        await umzug.up();
        console.log('✅ All migrations completed successfully');
        break;
        
      case 'down':
        console.log('🔽 Reverting last migration...');
        await umzug.down();
        console.log('✅ Migration reverted successfully');
        break;
        
      case 'status':
        console.log('📊 Migration status:');
        const executed = await umzug.executed();
        const pending = await umzug.pending();
        
        console.log('\nExecuted migrations:');
        console.log(executed.length ? executed.map(m => `✅ ${m.name}`).join('\n') : 'No executed migrations');
        
        console.log('\nPending migrations:');
        console.log(pending.length ? pending.map(m => `⏳ ${m.name}`).join('\n') : 'No pending migrations');
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('\nAvailable commands:');
        console.log('  up      - Run pending migrations (default)');
        console.log('  down    - Revert the last migration');
        console.log('  status  - Show migration status');
        process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations();
