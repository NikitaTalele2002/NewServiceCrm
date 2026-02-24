/**
 * Create remaining failing tables using raw SQL with proper FK ordering
 */

import { sequelize } from './db.js';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Creating remaining 9 tables\n');

    // Disable FK checks
    await sequelize.query(`EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT all'`);
    console.log('✅ FK checks disabled\n');

    // Drop any existing problematic tables
    const toDrop = [
      'technicians', 'call_technician_assignment', 'goods_movement_items',
      'service_invoices', 'service_invoice_items', 'ledger',
      'replacements', 'rsm_state_mapping', 'service_center_financial'
    ];
    
    console.log('Dropping old versions...');
    for (const table of toDrop) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS [${table}]`);
      } catch (err) {
        // Ignore
      }
    }
    console.log('✅ Old tables dropped\n');

    // Create tables in dependency order
    const sqlStatements = [
      {
        name: 'Technicians',
        sql: `CREATE TABLE [technicians] (
          [technician_id] INT IDENTITY(1,1) PRIMARY KEY,
          [service_center_id] INT NOT NULL,
          [user_id] INT NOT NULL,
          [name] NVARCHAR(150) NOT NULL,
          [mobile_no] NVARCHAR(20) NOT NULL UNIQUE,
          [email] NVARCHAR(100),
          [status] VARCHAR(255) CHECK ([status] IN(N'active', N'inactive', N'on_leave', N'suspended')),
          [remark] NVARCHAR(MAX),
          [created_at] DATETIMEOFFSET,
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [FK_tech_sc] FOREIGN KEY ([service_center_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_tech_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE
        );`
      },
      {
        name: 'Ledger',
        sql: `CREATE TABLE [ledger] (
          [ledger_id] INT IDENTITY(1,1) PRIMARY KEY,
          [asc_id] INT NOT NULL,
          [transaction_type] VARCHAR(255) CHECK ([transaction_type] IN(N'debit', N'credit')),
          [transaction_date] DATETIMEOFFSET,
          [reference_type] VARCHAR(255) CHECK ([reference_type] IN(N'spare_request', N'reimbursement', N'payment', N'adjustment', N'security_deposit')),
          [reference_id] INT,
          [debit_amount] DECIMAL(15,2) DEFAULT 0,
          [credit_amount] DECIMAL(15,2) DEFAULT 0,
          [opening_balance] DECIMAL(15,2),
          [closing_balance] DECIMAL(15,2),
          [is_reversed] BIT DEFAULT 0,
          [reversal_ref_id] INT,
          [reversal_reason] NVARCHAR(255),
          [reversed_at] DATETIMEOFFSET,
          [reversed_by] INT,
          [remarks] NVARCHAR(MAX),
          [created_at] DATETIMEOFFSET,
          [created_by] INT,
          CONSTRAINT [FK_ledger_asc] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_ledger_reversed_by] FOREIGN KEY ([reversed_by]) REFERENCES [users] ([user_id]) ON DELETE SET NULL,
          CONSTRAINT [FK_ledger_created_by] FOREIGN KEY ([created_by]) REFERENCES [users] ([user_id]) ON DELETE NO ACTION
        );`
      },
      {
        name: 'RSMStateMapping',
        sql: `CREATE TABLE [rsm_state_mapping] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [role_id] INT NOT NULL,
          [rsm_user_id] INT NOT NULL,
          [state_id] INT NOT NULL,
          [effective_from] DATETIMEOFFSET,
          [effective_to] DATETIMEOFFSET,
          [is_active] BIT DEFAULT 1,
          [created_at] DATETIMEOFFSET,
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [UC_rsm_state] UNIQUE ([rsm_user_id], [state_id]),
          CONSTRAINT [FK_rsm_role] FOREIGN KEY ([role_id]) REFERENCES [roles] ([roles_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_rsm_user] FOREIGN KEY ([rsm_user_id]) REFERENCES [rsms] ([rsm_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_rsm_state] FOREIGN KEY ([state_id]) REFERENCES [States] ([Id]) ON DELETE CASCADE
        );`
      },
      {
        name: 'ServiceCenterFinancial',
        sql: `CREATE TABLE [service_center_financial] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [asc_id] INT NOT NULL UNIQUE,
          [security_amount] DECIMAL(15,2) DEFAULT 0,
          [credit_limit] DECIMAL(15,2),
          [current_outstanding] DECIMAL(15,2) DEFAULT 0,
          [last_updated_at] DATETIMEOFFSET,
          [last_updated_by] INT,
          [created_at] DATETIMEOFFSET,
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [FK_scf_asc] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_scf_user] FOREIGN KEY ([last_updated_by]) REFERENCES [users] ([user_id]) ON DELETE SET NULL
        );`
      },
      {
        name: 'GoodsMovementItems',
        sql: `CREATE TABLE [goods_movement_items] (
          [movement_item_id] INT IDENTITY(1,1) PRIMARY KEY,
          [carton_id] INT,
          [movement_id] INT NOT NULL,
          [spare_part_id] INT NOT NULL,
          [qty] INT NOT NULL DEFAULT 0,
          [condition] VARCHAR(255) CHECK ([condition] IN(N'good', N'defective', N'damaged', N'partially_damaged')),
          [created_at] DATETIMEOFFSET,
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [FK_gmi_carton] FOREIGN KEY ([carton_id]) REFERENCES [cartons] ([carton_id]) ON DELETE SET NULL,
          CONSTRAINT [FK_gmi_movement] FOREIGN KEY ([movement_id]) REFERENCES [stock_movement] ([movement_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_gmi_spare] FOREIGN KEY ([spare_part_id]) REFERENCES [spare_parts] ([Id]) ON DELETE CASCADE
        );`
      },
      {
        name: 'CallTechnicianAssignment',
        sql: `CREATE TABLE [call_technician_assignment] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [call_id] INT NOT NULL,
          [technician_id] INT NOT NULL,
          [assigned_by_user_id] INT,
          [assigned_reason] VARCHAR(255) CHECK ([assigned_reason] IN(N'ABSENT', N'OVERLOADED', N'CUSTOMER_REQUEST', N'PERFORMANCE', N'AVAILABILITY')),
          [assigned_at] DATETIMEOFFSET,
          [unassigned_at] DATETIMEOFFSET,
          [is_active] BIT DEFAULT 1,
          [created_at] DATETIMEOFFSET,
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [FK_cta_call] FOREIGN KEY ([call_id]) REFERENCES [calls] ([call_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_cta_tech] FOREIGN KEY ([technician_id]) REFERENCES [technicians] ([technician_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_cta_user] FOREIGN KEY ([assigned_by_user_id]) REFERENCES [users] ([user_id]) ON DELETE SET NULL
        );`
      },
      {
        name: 'ServiceInvoice',
        sql: `CREATE TABLE [service_invoices] (
          [invoice_id] INT IDENTITY(1,1) PRIMARY KEY,
          [invoice_no] NVARCHAR(100) NOT NULL UNIQUE,
          [call_id] INT NOT NULL,
          [asc_id] INT,
          [technician_id] INT,
          [customer_id] INT NOT NULL,
          [invoice_date] DATETIMEOFFSET,
          [invoice_status] VARCHAR(255) CHECK ([invoice_status] IN(N'Draft', N'Generated', N'Sent', N'Paid', N'Partial-Paid', N'Overdue', N'Cancelled')),
          [invoice_type] VARCHAR(255) CHECK ([invoice_type] IN(N'Service', N'Spare-Parts', N'Labour', N'Mixed')),
          [subtotal_amount] DECIMAL(15,2) DEFAULT 0,
          [tax_amount] DECIMAL(10,2) DEFAULT 0,
          [discount_amount] DECIMAL(10,2) DEFAULT 0,
          [total_amount] DECIMAL(15,2) DEFAULT 0,
          [payment_mode] VARCHAR(255) CHECK ([payment_mode] IN(N'Cash', N'Credit-Card', N'Debit-Card', N'UPI', N'Bank-Transfer', N'Cheque', N'Other')),
          [payment_status] VARCHAR(255) CHECK ([payment_status] IN(N'Pending', N'Partial-Paid', N'Paid', N'Failed')),
          [created_at] DATETIMEOFFSET,
          [created_by] INT,
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [FK_si_call] FOREIGN KEY ([call_id]) REFERENCES [calls] ([call_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_si_asc] FOREIGN KEY ([asc_id]) REFERENCES [users] ([user_id]) ON DELETE SET NULL,
          CONSTRAINT [FK_si_tech] FOREIGN KEY ([technician_id]) REFERENCES [technicians] ([technician_id]) ON DELETE SET NULL,
          CONSTRAINT [FK_si_customer] FOREIGN KEY ([customer_id]) REFERENCES [customers] ([customer_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_si_created_by] FOREIGN KEY ([created_by]) REFERENCES [users] ([user_id])
        );`
      },
      {
        name: 'ServiceInvoiceItem',
        sql: `CREATE TABLE [service_invoice_items] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [invoice_id] INT NOT NULL,
          [item_type] VARCHAR(255) CHECK ([item_type] IN(N'Service', N'Spare-Parts', N'Labour', N'Miscellaneous')),
          [part_code] NVARCHAR(100),
          [description] NVARCHAR(MAX),
          [hsn_sac_code] NVARCHAR(50),
          [qty] INT NOT NULL,
          [unit_price] DECIMAL(10,2) NOT NULL,
          [line_amount] DECIMAL(15,2) NOT NULL,
          [tax_percent] DECIMAL(5,2),
          [tax_amount] DECIMAL(10,2) DEFAULT 0,
          [created_at] DATETIMEOFFSET,
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [FK_sii_invoice] FOREIGN KEY ([invoice_id]) REFERENCES [service_invoices] ([invoice_id]) ON DELETE CASCADE
        );`
      },
      {
        name: 'Replacements',
        sql: `CREATE TABLE [replacements] (
          [replacements_id] INT IDENTITY(1,1) PRIMARY KEY,
          [call_id] INT NOT NULL,
          [customers_products_id] INT NOT NULL,
          [reason] NVARCHAR(MAX),
          [status] VARCHAR(255) CHECK ([status] IN(N'pending', N'approved', N'rejected', N'completed', N'cancelled')),
          [service_tag_no] NVARCHAR(100),
          [requested_date] DATETIMEOFFSET,
          [technician_id] INT,
          [created_at] DATETIMEOFFSET,
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [FK_repl_call] FOREIGN KEY ([call_id]) REFERENCES [calls] ([call_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_repl_custprod] FOREIGN KEY ([customers_products_id]) REFERENCES [customers_products] ([customers_products_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_repl_tech] FOREIGN KEY ([technician_id]) REFERENCES [technicians] ([technician_id]) ON DELETE SET NULL
        );`
      }
    ];

    let created = 0;
    let failed = 0;
    
    for (const tbl of sqlStatements) {
      try {
        await sequelize.query(tbl.sql, { raw: true });
        created++;
        console.log(`✅ ${tbl.name}`);
      } catch (err) {
        failed++;
        console.log(`❌ ${tbl.name}`);
      }
    }

    // Re-enable FK checks
    console.log('\n✅ FK checks re-enabled');
    await sequelize.query(`EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all'`);

    console.log(`\n═══ RESULT ═══`);
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
