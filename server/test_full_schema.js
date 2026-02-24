import { sequelize } from './db.js';

async function main() {
  try {
    await sequelize.authenticate();
    
    // Create ActionLog with FULL schema
    const actionLogSQL = `
    CREATE TABLE [action_log] (
      [log_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [entity_type] NVARCHAR(100) NOT NULL,
      [entity_id] INTEGER NOT NULL,
      [action_user_role_id] INTEGER,
      [user_id] INTEGER NOT NULL,
      [old_status_id] INTEGER,
      [new_status_id] INTEGER,
      [old_substatus_id] INTEGER,
      [new_substatus_id] INTEGER,
      [remarks] NVARCHAR(MAX),
      [action_at] DATETIMEOFFSET,
      [created_at] DATETIMEOFFSET,
      [updated_at] DATETIMEOFFSET,
      CONSTRAINT [FK_al_role] FOREIGN KEY ([action_user_role_id]) REFERENCES [roles] ([roles_id]) ON DELETE SET NULL,
      CONSTRAINT [FK_al_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_al_old_status] FOREIGN KEY ([old_status_id]) REFERENCES [status] ([status_id]) ON DELETE SET NULL,
      CONSTRAINT [FK_al_new_status] FOREIGN KEY ([new_status_id]) REFERENCES [status] ([status_id]) ON DELETE SET NULL,
      CONSTRAINT [FK_al_old_substatus] FOREIGN KEY ([old_substatus_id]) REFERENCES [sub_status] ([sub_status_id]) ON DELETE SET NULL,
      CONSTRAINT [FK_al_new_substatus] FOREIGN KEY ([new_substatus_id]) REFERENCES [sub_status] ([sub_status_id]) ON DELETE SET NULL
    );`;
    
    console.log('Creating ActionLog...');
    try {
      await sequelize.query(actionLogSQL, { raw: true });
      console.log('✅ ActionLog created');
    } catch (e) {
      console.log('❌ ActionLog failed:', e.message || 'empty');
      console.log('Parent:', e.parent?.message || 'none');
    }

    // Create Technicians
    const technicianSQL = `
    CREATE TABLE [technicians] (
      [technician_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [service_center_id] INTEGER NOT NULL,
      [user_id] INTEGER NOT NULL,
      [name] NVARCHAR(150) NOT NULL,
      [mobile_no] NVARCHAR(20) NOT NULL UNIQUE,
      [email] NVARCHAR(100),
      [status] VARCHAR(255) CHECK ([status] IN(N'active', N'inactive', N'on_leave', N'suspended')),
      [remark] NVARCHAR(MAX),
      [created_at] DATETIMEOFFSET,
      [updated_at] DATETIMEOFFSET,
      CONSTRAINT [FK_tech_sc] FOREIGN KEY ([service_center_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_tech_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE
    );`;
    
    console.log('\nCreating Technicians...');
    try {
      await sequelize.query(technicianSQL, { raw: true });
      console.log('✅ Technicians created');
    } catch (e) {
      console.log('❌ Technicians failed:', e.message || 'empty');
    }

    // Create Ledger
    const ledgerSQL = `
    CREATE TABLE [ledger] (
      [ledger_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [asc_id] INTEGER NOT NULL,
      [transaction_type] VARCHAR(255) CHECK ([transaction_type] IN(N'debit', N'credit')),
      [transaction_date] DATETIMEOFFSET,
      [reference_type] VARCHAR(255) CHECK ([reference_type] IN(N'spare_request', N'reimbursement', N'payment', N'adjustment', N'security_deposit')),
      [reference_id] INTEGER,
      [debit_amount] DECIMAL(15,2) DEFAULT 0,
      [credit_amount] DECIMAL(15,2) DEFAULT 0,
      [opening_balance] DECIMAL(15,2),
      [closing_balance] DECIMAL(15,2),
      [is_reversed] BIT DEFAULT 0,
      [reversal_ref_id] INTEGER,
      [reversal_reason] NVARCHAR(255),
      [reversed_at] DATETIMEOFFSET,
      [reversed_by] INTEGER,
      [remarks] NVARCHAR(MAX),
      [created_at] DATETIMEOFFSET,
      [created_by] INTEGER,
      CONSTRAINT [FK_ledger_asc] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_ledger_reverse] FOREIGN KEY ([reversal_ref_id]) REFERENCES [ledger] ([ledger_id]) ON DELETE NO ACTION,
      CONSTRAINT [FK_ledger_reversed_by] FOREIGN KEY ([reversed_by]) REFERENCES [users] ([user_id]) ON DELETE SET NULL,
      CONSTRAINT [FK_ledger_created_by] FOREIGN KEY ([created_by]) REFERENCES [users] ([user_id]) ON DELETE NO ACTION
    );`;
    
    console.log('\nCreating Ledger...');
    try {
      await sequelize.query(ledgerSQL, { raw: true });
      console.log('✅ Ledger created');
    } catch (e) {
      console.log('❌ Ledger failed:', e.message || 'empty');
    }

    // Check what was created
    const tables = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_NAME IN ('action_log', 'technicians', 'ledger') AND TABLE_SCHEMA='dbo'`,
      { raw: true }
    );
    
    console.log('\n✅ Created tables:');
    tables[0].forEach(t => console.log(`  - ${t.TABLE_NAME}`));

    await sequelize.close();
  } catch (err) {
    console.error('Fatal:', err.message);
  }
}

main();
