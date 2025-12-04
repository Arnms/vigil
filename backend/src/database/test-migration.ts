import { AppDataSource } from '../data-source';

async function testMigration() {
  try {
    console.log('🧪 Starting migration test...\n');

    // Initialize data source
    console.log('1️⃣ Initializing data source...');
    await AppDataSource.initialize();
    console.log('✅ Data source initialized\n');

    // Drop all tables (clean slate)
    console.log('2️⃣ Dropping all tables for clean test...');
    await AppDataSource.dropDatabase();
    console.log('✅ All tables dropped\n');

    // Run migrations
    console.log('3️⃣ Running migrations...');
    await AppDataSource.runMigrations();
    console.log('✅ Migrations completed\n');

    // Verify tables exist
    console.log('4️⃣ Verifying tables...');
    const queryRunner = AppDataSource.createQueryRunner();

    const tables = await queryRunner.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('Tables created:');
    tables.forEach((table: any) => {
      console.log(`  - ${table.table_name}`);
    });
    console.log('');

    await queryRunner.release();

    // Verify expected tables
    const expectedTables = [
      'endpoints',
      'check_results',
      'incidents',
      'notification_channels',
      'migrations',
    ];

    const tableNames = tables.map((t: any) => t.table_name);
    const allTablesExist = expectedTables.every((table) =>
      tableNames.includes(table),
    );

    if (allTablesExist) {
      console.log('✅ All expected tables exist\n');
    } else {
      const missing = expectedTables.filter((t) => !tableNames.includes(t));
      console.error('❌ Missing tables:', missing);
      throw new Error('Not all expected tables exist');
    }

    console.log('🎉 Migration test completed successfully!\n');
    console.log('💡 To test rollback, run: npm run migration:revert');
  } catch (error) {
    console.error('❌ Migration test failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Data source connection closed');
    }
  }
}

testMigration();
