/**
 * Drop TechnicianSpareReturn tables
 */

import { sequelize, connectDB } from './db.js';

const dropTables = async () => {
  try {
    console.log('\n✅ Connecting to database...');
    await connectDB();
    console.log('✅ Database connected\n');

    console.log('========== DROPPING TABLES ==========\n');

    console.log('📝 Dropping technician_spare_return_items table...');
    await sequelize.query(`DROP TABLE IF EXISTS technician_spare_return_items`, { raw: true });
    console.log('✅ technician_spare_return_items dropped\n');

    console.log('📝 Dropping technician_spare_returns table...');
    await sequelize.query(`DROP TABLE IF EXISTS technician_spare_returns`, { raw: true });
    console.log('✅ technician_spare_returns dropped\n');

    console.log('========== TABLES DROPPED SUCCESSFULLY ==========\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

dropTables();
