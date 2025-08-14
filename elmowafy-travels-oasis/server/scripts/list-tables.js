import db from '../config/database.js';

async function listTables() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection established.');
    
    // Initialize models
    console.log('🔄 Initializing models...');
    await db.initModels();
    
    // Get all table names
    const [results] = await db.sequelize.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_type = 'BASE TABLE'
       ORDER BY table_name;`
    );
    
    console.log('\n📋 Database Tables:');
    console.log('=================');
    
    if (results.length === 0) {
      console.log('No tables found in the database.');
    } else {
      results.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name}`);
      });
    }
    
    // Get migrations table contents
    try {
      const [migrations] = await db.sequelize.query(
        'SELECT * FROM migrations ORDER BY executed_at DESC;'
      );
      
      console.log('\n🔄 Applied Migrations:');
      console.log('==================');
      
      if (migrations.length === 0) {
        console.log('No migrations have been applied yet.');
      } else {
        migrations.forEach((migration, index) => {
          console.log(`${index + 1}. ${migration.name} (${migration.executed_at})`);
        });
      }
    } catch (error) {
      console.warn('\n⚠️ Could not fetch migrations table:', error.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing tables:', error);
    process.exit(1);
  }
}

listTables();
