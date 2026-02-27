/**
 * Create TechnicianSpareReturn tables
 * Run this once to create the required tables
 * 
 * Usage: cd server && node create_technician_spare_return_tables.js
 */

import { sequelize, connectDB } from './db.js';
import { QueryTypes } from 'sequelize';

const createTables = async () => {
  try {
    console.log('\n✅ Connecting to database...');
    await connectDB();
    console.log('✅ Database connected\n');

    console.log('========== CREATING SPARE RETURN TABLES ==========\n');

    // Create main table
    console.log('📝 Creating technician_spare_returns table...');
    try {
      await sequelize.query(`DROP TABLE IF EXISTS technician_spare_return_items`, { raw: true });
      await sequelize.query(`DROP TABLE IF EXISTS technician_spare_returns`, { raw: true });
    } catch (e) {
      // Tables might not exist yet, that's fine
    }

    await sequelize.query(`
      CREATE TABLE technician_spare_returns (
        return_id INT PRIMARY KEY IDENTITY(1,1),
        call_id INT NULL,
        technician_id INT NOT NULL,
        service_center_id INT NOT NULL,
        return_number VARCHAR(100) UNIQUE NOT NULL,
        return_status VARCHAR(50) DEFAULT 'draft',
        return_date DATETIME NULL,
        received_date DATETIME NULL,
        verified_date DATETIME NULL,
        remarks TEXT NULL,
        received_remarks TEXT NULL,
        verified_remarks TEXT NULL,
        created_by INT NULL,
        received_by INT NULL,
        verified_by INT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
      );
    `, { raw: true });
    console.log('✅ technician_spare_returns table created\n');

    // Create items table
    console.log('📝 Creating technician_spare_return_items table...');
    await sequelize.query(`
      CREATE TABLE technician_spare_return_items (
        return_item_id INT PRIMARY KEY IDENTITY(1,1),
        return_id INT NOT NULL,
        spare_id INT NOT NULL,
        item_type VARCHAR(50) NOT NULL,
        requested_qty INT DEFAULT 0,
        received_qty INT DEFAULT 0,
        verified_qty INT DEFAULT 0,
        defect_reason VARCHAR(255) NULL,
        condition_on_receipt VARCHAR(50) NULL,
        remarks TEXT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (return_id) REFERENCES technician_spare_returns(return_id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `, { raw: true });
    console.log('✅ technician_spare_return_items table created\n');

    console.log('========== TABLES CREATED SUCCESSFULLY ==========\n');
    console.log('✅ Ready to seed data!\n');
    console.log('Next step: Run the following command:');
    console.log('   node seed_spare_return_data.js\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', JSON.stringify(error, null, 2));
    if (error.original) {
      console.error('Original Error:', error.original.message);
      console.error('Original Code:', error.original.code);
    }
    process.exit(1);
  }
};

createTables();
