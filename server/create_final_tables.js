/**
 * Create the final remaining tables
 */

import { sequelize } from './db.js';

const finalTables = [
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
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id]) ON DELETE CASCADE
  )`,

  `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ledger')
  CREATE TABLE [ledger] (
    [ledger_id] INT IDENTITY(1,1) PRIMARY KEY,
    [transaction_type] NVARCHAR(50) NOT NULL,
    [debit_credit] NVARCHAR(20) NOT NULL,
    [amount] DECIMAL(10,2) NOT NULL,
    [reference_type] NVARCHAR(100),
    [reference_id] INT,
    [user_id] INT,
    [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
    FOREIGN KEY ([user_id]) REFERENCES [users]([user_id]) ON DELETE SET NULL
  )`,

  `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'call_technician_assignment')
  CREATE TABLE [call_technician_assignment] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [call_id] INT,
    [technician_id] INT,
    [reason] NVARCHAR(100),
    [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
    FOREIGN KEY ([call_id]) REFERENCES [calls]([call_id]) ON DELETE CASCADE,
    FOREIGN KEY ([technician_id]) REFERENCES [technicians]([technician_id]) ON DELETE SET NULL
  )`,

  `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'replacements')
  CREATE TABLE [replacements] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [call_id] INT,
    [replacement_status] NVARCHAR(50) DEFAULT 'pending',
    [reason] TEXT,
    [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
    [updated_at] DATETIMEOFFSET DEFAULT GETDATE(),
    FOREIGN KEY ([call_id]) REFERENCES [calls]([call_id]) ON DELETE CASCADE
  )`,

  `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'goods_movement_items')
  CREATE TABLE [goods_movement_items] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [stock_movement_id] INT,
    [spare_id] INT,
    [from_location] NVARCHAR(100),
    [to_location] NVARCHAR(100),
    [quantity] INT,
    [item_condition] NVARCHAR(50),
    [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
    FOREIGN KEY ([spare_id]) REFERENCES [spare_parts]([Id]) ON DELETE SET NULL
  )`,

  `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'service_center_financial')
  CREATE TABLE [service_center_financial] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [service_center_id] INT,
    [total_revenue] DECIMAL(12,2),
    [total_expenses] DECIMAL(12,2),
    [profit_loss] DECIMAL(12,2),
    [financial_period] NVARCHAR(50),
    [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
    [updated_at] DATETIMEOFFSET DEFAULT GETDATE(),
    FOREIGN KEY ([service_center_id]) REFERENCES [service_centers]([asc_id]) ON DELETE CASCADE
  )`
];

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to NewCRM\n');
    console.log('🔄 Creating final tables...\n');

    for (const statement of finalTables) {
      try {
        await sequelize.query(statement);
        const match = statement.match(/TABLE \[?([a-z_]+)\]?/i);
        const tableName = match ? match[1] : 'unknown';
        console.log(`✅ ${tableName}`);
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.log(`⚠️  Error: ${err.message.substring(0, 60)}`);
        } else {
          const match = statement.match(/TABLE \[?([a-z_]+)\]?/i);
          const tableName = match ? match[1] : 'unknown';
          console.log(`✓ ${tableName} (already exists)`);
        }
      }
    }

    // Final count
    const [tableCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
    `);

    console.log(`\n✅ FINAL DATABASE STATE:`);
    console.log(`   Total tables created: ${tableCount[0].count}`);
    console.log(`\n✨ NewCRM database synchronization complete!`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
