import { AppDataSource } from '../../data-source';
import { seedEndpoints } from './endpoint.seed';
import { seedNotificationChannels } from './notification-channel.seed';

async function runSeeds() {
  try {
    console.log('🌱 Starting database seeding...');

    // Initialize data source
    await AppDataSource.initialize();
    console.log('✅ Data source initialized');

    // Run seeds
    await seedEndpoints(AppDataSource);
    await seedNotificationChannels(AppDataSource);

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    // Close connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Data source connection closed');
    }
  }
}

runSeeds();
