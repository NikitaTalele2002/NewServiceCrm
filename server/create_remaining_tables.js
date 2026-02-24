/**
 * Create remaining tables using direct SQL
 * This bypasses Sequelize dialect issues
 */

import { sequelize } from './db.js';

const createTableStatements = [
  `CREATE TABLE [users] (
    [user_id] INT IDENTITY(1,1) PRIMARY KEY,
    [name] NVARCHAR(100) NOT NULL,
    [password] NVARCHAR(255) NOT NULL,
    [role_id] INT,
    [is_locked] BIT DEFAULT 0,
    [failed_login_attempts] INT DEFAULT 0,
    [last_password_change] DATETIMEOFFSET,
    [password_expiry_date] DATETIMEOFFSET,
    [unlock_requested_at] DATETIMEOFFSET,
    [updated_at] DATETIMEOFFSET DEFAULT GETDATE(),
    FOREIGN KEY ([role_id]) REFERENCES [roles]([roles_id]) ON DELETE SET NULL
  )`,

  `CREATE TABLE [customers] (
    [customer_id] INT IDENTITY(1,1) PRIMARY KEY,
    [name] NVARCHAR(150) NOT NULL,
    [mobile_no] NVARCHAR(20) NOT NULL UNIQUE,
    [alt_mob_no] NVARCHAR(20),
    [email] NVARCHAR(100) UNIQUE,
    [house_no] NVARCHAR(50),
    [street_name] NVARCHAR(150),
    [building_name] NVARCHAR(150),
    [area] NVARCHAR(150),
    [landmark] NVARCHAR(150),
    [city_id] INT,
    [state_id] INT,
    [pincode] NVARCHAR(10),
    [customer_code] NVARCHAR(50) UNIQUE,
    [customer_priority] NVARCHAR(20) DEFAULT 'medium',
    [created_by] INT,
    [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
    [updated_at] DATETIMEOFFSET DEFAULT GETDATE(),
    FOREIGN KEY ([city_id]) REFERENCES [Cities]([Id]) ON DELETE SET NULL,
    FOREIGN KEY ([state_id]) REFERENCES [States]([Id]) ON DELETE SET NULL,
    FOREIGN KEY ([created_by]) REFERENCES [users]([user_id]) ON DELETE SET NULL
  )`,

  `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'calls')
  CREATE TABLE [calls] (
    [call_id] INT IDENTITY(1,1) PRIMARY KEY,
    [ref_call_id] INT,
    [customer_id] INT NOT NULL,
    [customer_product_id] INT,
    [assigned_asc_id] INT,
    [assigned_tech_id] INT,
    [call_type] NVARCHAR(50) NOT NULL,
    [call_source] NVARCHAR(50) NOT NULL,
    [caller_type] NVARCHAR(50) NOT NULL,
    [preferred_language] NVARCHAR(50),
    [caller_mobile_no] NVARCHAR(20),
    [remark] TEXT,
    [visit_date] DATETIMEOFFSET,
    [status_id] INT,
    [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
    [updated_at] DATETIMEOFFSET DEFAULT GETDATE(),
    CONSTRAINT fk_call_customer FOREIGN KEY ([customer_id]) REFERENCES [customers]([customer_id]) ON DELETE CASCADE,
    CONSTRAINT fk_call_status FOREIGN KEY ([status_id]) REFERENCES [status]([status_id]) ON DELETE SET NULL
  )`,

  `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'technicians')
  CREATE TABLE [technicians] (
    [technician_id] INT IDENTITY(1,1) PRIMARY KEY,
    [service_center_id] INT NOT NULL,
    [user_id] INT NOT NULL,
    [name] NVARCHAR(150) NOT NULL,
    [mobile_no] NVARCHAR(20) NOT NULL UNIQUE,
    [email] NVARCHAR(100),
    [status] NVARCHAR(20) DEFAULT 'active',
    [remark] TEXT,
    [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
    [updated_at] DATETIMEOFFSET DEFAULT GETDATE(),
    FOREIGN KEY ([service_center_id]) REFERENCES [service_centers]([asc_id]) ON DELETE CASCADE,
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id]) ON DELETE CASCADE
  )`,

  `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'action_log')
  CREATE TABLE [action_log] (
    [log_id] INT IDENTITY(1,1) PRIMARY KEY,
    [entity_type] NVARCHAR(100) NOT NULL,
    [entity_id] INT NOT NULL,
    [action_user_role_id] INT,
    [user_id] INT NOT NULL,
    [old_status_id] INT,
    [new_status_id] INT,
    [action_type] NVARCHAR(100),
    [action_description] TEXT,
    [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
    FOREIGN KEY ([action_user_role_id]) REFERENCES [roles]([roles_id]) ON DELETE SET NULL,
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id]) ON DELETE CASCADE,
    FOREIGN KEY ([old_status_id]) REFERENCES [status]([status_id]) ON DELETE SET NULL,
    FOREIGN KEY ([new_status_id]) REFERENCES [status]([status_id]) ON DELETE SET NULL
  )`,

  `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'customers_products')
  CREATE TABLE [customers_products] (
    [customers_products_id] INT IDENTITY(1,1) PRIMARY KEY,
    [customer_id] INT,
    [product_id] INT,
    [model_id] INT,
    [warranty_end_date] DATETIMEOFFSET,
    [warranty_status] NVARCHAR(50),
    [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
    FOREIGN KEY ([customer_id]) REFERENCES [customers]([customer_id]) ON DELETE CASCADE
  )`,

  `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'rsm_state_mapping')
  CREATE TABLE [rsm_state_mapping] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [rsm_user_id] INT,
    [state_id] INT,
    [created_at] DATETIMEOFFSET DEFAULT GETDATE()
  )`,

  `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'happy_codes')
  CREATE TABLE [happy_codes] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [call_id] INT,
    [happy_code] NVARCHAR(50),
    [status] NVARCHAR(50) DEFAULT 'pending',
    [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
    FOREIGN KEY ([call_id]) REFERENCES [calls]([call_id]) ON DELETE CASCADE
  )`,

  `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'spare_request')
  CREATE TABLE [spare_request] (
    [request_id] INT IDENTITY(1,1) PRIMARY KEY,
    [call_id] INT,
    [technician_id] INT,
    [requested_source_type] NVARCHAR(50),
    [requested_source_id] INT,
    [status_id] INT,
    [request_priority] NVARCHAR(50) DEFAULT 'normal',
    [requested_from] NVARCHAR(50),
    [requested_for_location] NVARCHAR(50),
    [spare_request_type] NVARCHAR(50),
    [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
    [updated_at] DATETIMEOFFSET DEFAULT GETDATE(),
    FOREIGN KEY ([call_id]) REFERENCES [calls]([call_id]) ON DELETE CASCADE,
    FOREIGN KEY ([technician_id]) REFERENCES [technicians]([technician_id]) ON DELETE SET NULL,
    FOREIGN KEY ([status_id]) REFERENCES [status]([status_id]) ON DELETE SET NULL
  )`,

  `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'spare_request_item')
  CREATE TABLE [spare_request_item] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [request_id] INT,
    [spare_id] INT,
    [quantity] INT,
    [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
    FOREIGN KEY ([request_id]) REFERENCES [spare_request]([request_id]) ON DELETE CASCADE,
    FOREIGN KEY ([spare_id]) REFERENCES [spare_parts]([Id]) ON DELETE SET NULL
  )`,

  `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'service_invoice')
  CREATE TABLE [service_invoice] (
    [invoice_id] INT IDENTITY(1,1) PRIMARY KEY,
    [call_id] INT,
    [invoice_number] NVARCHAR(100) UNIQUE,
    [invoice_status] NVARCHAR(50) DEFAULT 'Draft',
    [service_type] NVARCHAR(50),
    [total_amount] DECIMAL(10,2),
    [gst_amount] DECIMAL(10,2),
    [payment_method] NVARCHAR(50),
    [payment_status] NVARCHAR(50) DEFAULT 'Pending',
    [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
    [updated_at] DATETIMEOFFSET DEFAULT GETDATE(),
    FOREIGN KEY ([call_id]) REFERENCES [calls]([call_id]) ON DELETE CASCADE
  )`,

  `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'service_invoice_item')
  CREATE TABLE [service_invoice_item] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [invoice_id] INT,
    [item_type] NVARCHAR(50),
    [description] TEXT,
    [quantity] INT,
    [unit_price] DECIMAL(10,2),
    [amount] DECIMAL(10,2),
    [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
    FOREIGN KEY ([invoice_id]) REFERENCES [service_invoice]([invoice_id]) ON DELETE CASCADE
  )`
];

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to NewCRM\n');

    console.log('🔄 Creating remaining tables...\n');

    for (const statement of createTableStatements) {
      try {
        await sequelize.query(statement);
        const tableName = statement.match(/TABLE \[?([a-z_]+)\]?/i)?.[1] || 'unknown';
        console.log(`✅ Created/Verified: ${tableName}`);
      } catch (err) {
        // Table might already exist
        if (!err.message.includes('already exists')) {
          console.log(`⚠️  ${err.message.substring(0, 50)}`);
        }
      }
    }

    // Final verification
    const [tables] = await sequelize.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
    `);

    console.log(`\n✅ Total tables in NewCRM: ${tables[0].count}`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
