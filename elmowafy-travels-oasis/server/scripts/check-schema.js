import db from '../config/database.js';

async function checkSchema() {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established.');
    
    // Initialize models
    console.log('🔄 Initializing models...');
    await db.initModels();
    
    // Get all tables
    console.log('\n📋 Database Tables:');
    console.log('=================');
    
    const [tables] = await db.sequelize.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_type = 'BASE TABLE'
       ORDER BY table_name;`
    );
    
    if (tables.length === 0) {
      console.log('No tables found in the database.');
    } else {
      console.table(tables.map(t => ({ 'Table Name': t.table_name })));
    }
    
    // Check migrations table
    console.log('\n🔄 Checking migrations...');
    try {
      const [migrations] = await db.sequelize.query('SELECT * FROM migrations ORDER BY executed_at DESC;');
      
      if (migrations.length === 0) {
        console.log('No migrations have been applied yet.');
      } else {
        console.log('\n✅ Applied Migrations:');
        console.table(migrations.map(m => ({
          'ID': m.id,
          'Name': m.name,
          'Executed At': m.executed_at
        })));
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch migrations table:', error.message);
    }
    
    // Check each table's structure
    console.log('\n🔍 Table Structures:');
    console.log('==================');
    
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`\n📊 Table: ${tableName}`);
      
      try {
        // Get table columns
        const [columns] = await db.sequelize.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = '${tableName}'
          ORDER BY ordinal_position;
        `);
        
        if (columns.length > 0) {
          console.table(columns.map(c => ({
            'Column': c.column_name,
            'Type': c.data_type,
            'Nullable': c.is_nullable,
            'Default': c.column_default
          })));
        } else {
          console.log('No columns found or table is empty.');
        }
        
        // Get table constraints
        const [constraints] = await db.sequelize.query(`
          SELECT 
            tc.constraint_name, 
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
          FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            LEFT JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
          WHERE 
            tc.table_name = '${tableName}'
          ORDER BY 
            tc.constraint_type,
            tc.constraint_name;
        `);
        
        if (constraints.length > 0) {
          console.log('\n🔗 Constraints:');
          console.table(constraints.map(c => ({
            'Name': c.constraint_name,
            'Type': c.constraint_type,
            'Column': c.column_name,
            'References': c.foreign_table_name 
              ? `${c.foreign_table_name}(${c.foreign_column_name})` 
              : 'N/A'
          })));
        }
        
        // Get table indexes
        const [indexes] = await db.sequelize.query(`
          SELECT
            i.relname AS index_name,
            a.attname AS column_name,
            ix.indisunique AS is_unique,
            ix.indisprimary AS is_primary
          FROM
            pg_class t,
            pg_class i,
            pg_index ix,
            pg_attribute a
          WHERE
            t.oid = ix.indrelid
            AND i.oid = ix.indexrelid
            AND a.attrelid = t.oid
            AND a.attnum = ANY(ix.indkey)
            AND t.relkind = 'r'
            AND t.relname = '${tableName}'
          ORDER BY
            t.relname,
            i.relname;
        `);
        
        if (indexes.length > 0) {
          console.log('\n🔍 Indexes:');
          console.table(indexes.map(i => ({
            'Index': i.index_name,
            'Column': i.column_name,
            'Type': i.is_primary ? 'PRIMARY KEY' : i.is_unique ? 'UNIQUE' : 'INDEX'
          })));
        }
        
      } catch (error) {
        console.error(`❌ Error checking table ${tableName}:`, error.message);
      }
      
      console.log('\n' + '='.repeat(50));
    }
    
    console.log('\n✅ Database schema check completed successfully.');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error checking database schema:', error);
    process.exit(1);
  }
}

checkSchema();
