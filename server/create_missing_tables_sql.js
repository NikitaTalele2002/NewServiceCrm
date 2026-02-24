import { sequelize } from './db.js';

/** 
 * Test creating the 10 failing tables with better error handling
 */

const tablesToCreate = [
  {
    name: 'Ledger',
    sql: `IF OBJECT_ID('[ledger]', 'U') IS NULL 
    CREATE TABLE [ledger] (
      [ledger_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [asc_id] INTEGER NOT NULL,
      [transaction_type] VARCHAR(255) CHECK ([transaction_type] IN(N'debit', N'credit')),
      [transaction_date] DATETIMEOFFSET NULL,
      [reference_type] VARCHAR(255) CHECK ([reference_type] IN(N'spare_request', N'reimbursement', N'payment', N'adjustment', N'security_deposit')),
      [reference_id] INTEGER NULL,
      [debit_amount] DECIMAL(15,2) DEFAULT 0,
      [credit_amount] DECIMAL(15,2) DEFAULT 0,
      [opening_balance] DECIMAL(15,2) NULL,
      [closing_balance] DECIMAL(15,2) NULL,
      [is_reversed] BIT DEFAULT 0,
      [reversal_ref_id] INTEGER NULL,
      [reversal_reason] NVARCHAR(255) NULL,
      [reversed_at] DATETIMEOFFSET NULL,
      [reversed_by] INTEGER NULL,
      [remarks] NVARCHAR(MAX) NULL,
      [created_at] DATETIMEOFFSET NULL,
      [created_by] INTEGER NULL,
      CONSTRAINT [FK_ledger_asc_id] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_ledger_reversal] FOREIGN KEY ([reversal_ref_id]) REFERENCES [ledger] ([ledger_id]) ON DELETE NO ACTION,
      CONSTRAINT [FK_ledger_reversed_by] FOREIGN KEY ([reversed_by]) REFERENCES [users] ([user_id]) ON DELETE SET NULL,
      CONSTRAINT [FK_ledger_created_by] FOREIGN KEY ([created_by]) REFERENCES [users] ([user_id]) ON DELETE NO ACTION
    )`
  },
  {
    name: 'Technicians',
    sql: `IF OBJECT_ID('[technicians]', 'U') IS NULL 
    CREATE TABLE [technicians] (
      [technician_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [service_center_id] INTEGER NOT NULL,
      [user_id] INTEGER NOT NULL,
      [name] NVARCHAR(150) NOT NULL,
      [mobile_no] NVARCHAR(20) NOT NULL UNIQUE,
      [email] NVARCHAR(100) NULL,
      [status] VARCHAR(255) CHECK ([status] IN(N'active', N'inactive', N'on_leave', N'suspended')),
      [remark] NVARCHAR(MAX) NULL,
      [created_at] DATETIMEOFFSET NULL,
      [updated_at] DATETIMEOFFSET NULL,
      CONSTRAINT [FK_tech_service_center] FOREIGN KEY ([service_center_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_tech_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE
    )`
  },
  {
    name: 'ActionLog',
    sql: `IF OBJECT_ID('[action_log]', 'U') IS NULL 
    CREATE TABLE [action_log] (
      [log_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [entity_type] NVARCHAR(100) NOT NULL,
      [entity_id] INTEGER NOT NULL,
      [action_user_role_id] INTEGER NULL,
      [user_id] INTEGER NOT NULL,
      [old_status_id] INTEGER NULL,
      [new_status_id] INTEGER NULL,
      [old_substatus_id] INTEGER NULL,
      [new_substatus_id] INTEGER NULL,
      [remarks] NVARCHAR(MAX) NULL,
      [action_at] DATETIMEOFFSET NULL,
      [created_at] DATETIMEOFFSET NULL,
      [updated_at] DATETIMEOFFSET NULL,
      CONSTRAINT [FK_action_log_role] FOREIGN KEY ([action_user_role_id]) REFERENCES [roles] ([roles_id]) ON DELETE SET NULL,
      CONSTRAINT [FK_action_log_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_action_old_status] FOREIGN KEY ([old_status_id]) REFERENCES [status] ([status_id]) ON DELETE SET NULL,
      CONSTRAINT [FK_action_new_status] FOREIGN KEY ([new_status_id]) REFERENCES [status] ([status_id]) ON DELETE SET NULL,
      CONSTRAINT [FK_action_old_substatus] FOREIGN KEY ([old_substatus_id]) REFERENCES [sub_status] ([sub_status_id]) ON DELETE SET NULL,
      CONSTRAINT [FK_action_new_substatus] FOREIGN KEY ([new_substatus_id]) REFERENCES [sub_status] ([sub_status_id]) ON DELETE SET NULL
    )`
  },
  {
    name: 'RSMStateMapping',
    sql: `IF OBJECT_ID('[rsm_state_mapping]', 'U') IS NULL 
    CREATE TABLE [rsm_state_mapping] (
      [id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [role_id] INTEGER NOT NULL,
      [rsm_user_id] INTEGER NOT NULL,
      [state_id] INTEGER NOT NULL,
      [effective_from] DATETIMEOFFSET NULL,
      [effective_to] DATETIMEOFFSET NULL,
      [is_active] BIT DEFAULT 1,
      [created_at] DATETIMEOFFSET NULL,
      [updated_at] DATETIMEOFFSET NULL,
      CONSTRAINT [UC_rsm_state] UNIQUE ([rsm_user_id], [state_id]),
      CONSTRAINT [FK_rsm_role] FOREIGN KEY ([role_id]) REFERENCES [roles] ([roles_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_rsm_user] FOREIGN KEY ([rsm_user_id]) REFERENCES [rsms] ([rsm_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_rsm_state] FOREIGN KEY ([state_id]) REFERENCES [States] ([Id]) ON DELETE CASCADE
    )`
  },
  {
    name: 'ServiceCenterFinancial',
    sql: `IF OBJECT_ID('[service_center_financial]', 'U') IS NULL 
    CREATE TABLE [service_center_financial] (
      [id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [asc_id] INTEGER NOT NULL UNIQUE,
      [security_amount] DECIMAL(15,2) DEFAULT 0,
      [credit_limit] DECIMAL(15,2) NULL,
      [current_outstanding] DECIMAL(15,2) DEFAULT 0,
      [last_updated_at] DATETIMEOFFSET NULL,
      [last_updated_by] INTEGER NULL,
      [created_at] DATETIMEOFFSET NULL,
      [updated_at] DATETIMEOFFSET NULL,
      CONSTRAINT [FK_scf_asc] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_scf_user] FOREIGN KEY ([last_updated_by]) REFERENCES [users] ([user_id]) ON DELETE SET NULL
    )`
  },
  {
    name: 'GoodsMovementItems',
    sql: `IF OBJECT_ID('[goods_movement_items]', 'U') IS NULL 
    CREATE TABLE [goods_movement_items] (
      [movement_item_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [carton_id] INTEGER NULL,
      [movement_id] INTEGER NOT NULL,
      [spare_part_id] INTEGER NOT NULL,
      [qty] INTEGER NOT NULL DEFAULT 0,
      [condition] VARCHAR(255) CHECK ([condition] IN(N'good', N'defective', N'damaged', N'partially_damaged')),
      [created_at] DATETIMEOFFSET NULL,
      [updated_at] DATETIMEOFFSET NULL,
      CONSTRAINT [FK_gmi_carton] FOREIGN KEY ([carton_id]) REFERENCES [cartons] ([carton_id]) ON DELETE SET NULL,
      CONSTRAINT [FK_gmi_movement] FOREIGN KEY ([movement_id]) REFERENCES [stock_movement] ([movement_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_gmi_spare] FOREIGN KEY ([spare_part_id]) REFERENCES [spare_parts] ([Id]) ON DELETE CASCADE
    )`
  },
  {
    name: 'CallTechnicianAssignment',
    sql: `IF OBJECT_ID('[call_technician_assignment]', 'U') IS NULL 
    CREATE TABLE [call_technician_assignment] (
      [id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [call_id] INTEGER NOT NULL,
      [technician_id] INTEGER NOT NULL,
      [assigned_by_user_id] INTEGER NULL,
      [assigned_reason] VARCHAR(255) CHECK ([assigned_reason] IN(N'ABSENT', N'OVERLOADED', N'CUSTOMER_REQUEST', N'PERFORMANCE', N'AVAILABILITY')),
      [assigned_at] DATETIMEOFFSET NULL,
      [unassigned_at] DATETIMEOFFSET NULL,
      [is_active] BIT DEFAULT 1,
      [created_at] DATETIMEOFFSET NULL,
      [updated_at] DATETIMEOFFSET NULL,
      CONSTRAINT [FK_cta_call] FOREIGN KEY ([call_id]) REFERENCES [calls] ([call_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_cta_tech_temp] FOREIGN KEY ([technician_id]) REFERENCES [technicians] ([technician_id]) ON DELETE NO ACTION,
      CONSTRAINT [FK_cta_user] FOREIGN KEY ([assigned_by_user_id]) REFERENCES [users] ([user_id]) ON DELETE SET NULL
    )`
  },
  {
    name: 'Replacements',
    sql: `IF OBJECT_ID('[replacements]', 'U') IS NULL 
    CREATE TABLE [replacements] (
      [replacements_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [call_id] INTEGER NOT NULL,
      [customers_products_id] INTEGER NOT NULL,
      [reason] NVARCHAR(MAX) NULL,
      [status] VARCHAR(255) CHECK ([status] IN(N'pending', N'approved', N'rejected', N'completed', N'cancelled')),
      [service_tag_no] NVARCHAR(100) NULL,
      [requested_date] DATETIMEOFFSET NULL,
      [technician_id] INTEGER NULL,
      [created_at] DATETIMEOFFSET NULL,
      [updated_at] DATETIMEOFFSET NULL,
      CONSTRAINT [FK_repl_call] FOREIGN KEY ([call_id]) REFERENCES [calls] ([call_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_repl_custprod] FOREIGN KEY ([customers_products_id]) REFERENCES [customers_products] ([customers_products_id]) ON DELETE CASCADE,
      CONSTRAINT [FK_repl_tech_temp] FOREIGN KEY ([technician_id]) REFERENCES [technicians] ([technician_id]) ON DELETE NO ACTION
    )`
  }
];

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    let created = 0;
    let failed = 0;

    for (const table of tablesToCreate) {
      try {
        console.log(`\n📝 Creating: ${table.name}`);
        await sequelize.query(table.sql, { raw: true });
        created++;
        console.log(`✅ ${table.name} created`);
      } catch (err) {
        failed++;
        console.log(`❌ ${table.name} FAILED`);
        console.log(`   Error: ${err.message.substring(0, 150)}`);
        console.log(`   Parent: ${err.parent?.message || 'N/A'}`);
      }
    }

    console.log(`\n\n═══ SUMMARY ═══`);
    console.log(`✅ Created: ${created}`);
    console.log(`❌ Failed: ${failed}`);

    // Verify
    const verify = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_TYPE='BASE TABLE' AND TABLE_SCHEMA='dbo'`,
      { raw: true, type: sequelize.QueryTypes.SELECT }
    );
    console.log(`\n📊 Total tables: ${verify[0].cnt}`);

    await sequelize.close();
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

main();
