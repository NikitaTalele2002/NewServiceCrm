import { sequelize } from './db.js';
import { OrderRequest } from './models/index.js';

/**
 * Migration script to create order_requests table
 * Run with: node create_order_requests_table.js
 */

async function createTable() {
  try {
    console.log('🔄 Attempting to create order_requests table...');
    
    // Sync the OrderRequest model with the database
    await OrderRequest.sync({ alter: true });
    
    console.log('✅ OrderRequest table created/updated successfully');
    console.log('📋 Table schema:');
    console.log('  - id (PK, auto-increment)');
    console.log('  - request_id (unique, string)');
    console.log('  - service_center_id (FK)');
    console.log('  - product_group_id (FK)');
    console.log('  - product_master_id (FK)');
    console.log('  - product_model_id (FK)');
    console.log('  - spare_part_id (FK)');
    console.log('  - quantity (integer)');
    console.log('  - status (enum: pending, approved, rejected, completed, cancelled)');
    console.log('  - order_type (string, default: MSL)');
    console.log('  - requested_by_id (FK to users)');
    console.log('  - approved_by_id (FK to users)');
    console.log('  - remarks (text)');
    console.log('  - created_at (timestamp)');
    console.log('  - updated_at (timestamp)');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating table:', err.message);
    console.error(err);
    process.exit(1);
  }
}

createTable();
