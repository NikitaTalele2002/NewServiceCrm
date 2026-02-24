import { poolPromise } from './db.js';

/**
 * Migration script to create order_requests table using raw SQL
 * Run with: node create_order_requests_table_sql.js
 */

async function createTable() {
  try {
    console.log('🔄 Attempting to create order_requests table...');
    
    const pool = await poolPromise;
    
    // Check if table exists
    const tableCheck = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'order_requests'
    `);
    
    if (tableCheck.recordset.length > 0) {
      console.log('✅ order_requests table already exists');
      process.exit(0);
    }
    
    // Create the table with all the constraints
    const createTableSQL = `
      CREATE TABLE order_requests (
        id INT PRIMARY KEY IDENTITY(1,1),
        request_id NVARCHAR(255) NOT NULL UNIQUE,
        service_center_id INT NOT NULL,
        product_group_id INT NOT NULL,
        product_master_id INT NOT NULL,
        product_model_id INT NOT NULL,
        spare_part_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        [status] NVARCHAR(50) NOT NULL DEFAULT 'pending',
        order_type NVARCHAR(50) DEFAULT 'MSL',
        requested_by_id INT NULL,
        approved_by_id INT NULL,
        remarks NVARCHAR(MAX) NULL,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
      )
    `;
    
    await pool.request().query(createTableSQL);
    console.log('✅ order_requests table created successfully');
    
    // Add foreign keys separately
    const addFKsSQL = `
      ALTER TABLE order_requests
      ADD 
        CONSTRAINT FK_OR_ServiceCenter FOREIGN KEY (service_center_id) REFERENCES service_centers(asc_id),
        CONSTRAINT FK_OR_ProductGroup FOREIGN KEY (product_group_id) REFERENCES ProductGroups(Id),
        CONSTRAINT FK_OR_ProductMaster FOREIGN KEY (product_master_id) REFERENCES ProductMasters(ID),
        CONSTRAINT FK_OR_ProductModel FOREIGN KEY (product_model_id) REFERENCES ProductModels(Id),
        CONSTRAINT FK_OR_SparePart FOREIGN KEY (spare_part_id) REFERENCES SpareParts(Id),
        CONSTRAINT FK_OR_RequestedBy FOREIGN KEY (requested_by_id) REFERENCES users(user_id),
        CONSTRAINT FK_OR_ApprovedBy FOREIGN KEY (approved_by_id) REFERENCES users(user_id);
    `;
    
    try {
      await pool.request().query(addFKsSQL);
      console.log('✅ Foreign keys added successfully');
    } catch (fkErr) {
      console.warn('⚠️ Warning adding foreign keys:', fkErr.message);
      console.log('Table created but foreign keys may need manual setup');
    }
    
    console.log('📋 Table schema:');
    console.log('  - id (PK, auto-increment)');
    console.log('  - request_id (unique, string)');
    console.log('  - service_center_id (FK to service_centers)');
    console.log('  - product_group_id (FK to ProductGroups)');
    console.log('  - product_master_id (FK to ProductMasters)');
    console.log('  - product_model_id (FK to ProductModels)');
    console.log('  - spare_part_id (FK to SpareParts)');
    console.log('  - quantity (integer, default: 1)');
    console.log('  - status (nvarchar, default: pending)');
    console.log('  - order_type (nvarchar, default: MSL)');
    console.log('  - requested_by_id (FK to users)');
    console.log('  - approved_by_id (FK to users)');
    console.log('  - remarks (nvarchar(max))');
    console.log('  - created_at (datetime)');
    console.log('  - updated_at (datetime)');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating table:', err.message);
    if (err.originalError) {
      console.error('Database error:', err.originalError.message);
    }
    process.exit(1);
  }
}

createTable();
