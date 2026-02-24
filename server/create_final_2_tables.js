/**
 * Create final 2 tables (ServiceInvoice and ServiceInvoiceItem)
 */

import { sequelize } from './db.js';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Creating final 2 tables\n');

    // Drop if exists
    try {
      await sequelize.query(`DROP TABLE IF EXISTS [service_invoice_items]`);
      await sequelize.query(`DROP TABLE IF EXISTS [service_invoices]`);
    } catch (e) {
      // ignore
    }

    // Create without customer FK first
    console.log('Creating ServiceInvoice (without customer FK)...');
    const invoiceSQL = `CREATE TABLE [service_invoices] (
      [invoice_id] INT IDENTITY(1,1) PRIMARY KEY,
      [invoice_no] NVARCHAR(100) NOT NULL UNIQUE,
      [call_id] INT NOT NULL,
      [asc_id] INT,
      [technician_id] INT,
      [customer_id] INT,
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
      CONSTRAINT [FK_si_asc] FOREIGN KEY ([asc_id]) REFERENCES [users] ([user_id]) ON DELETE NO ACTION,
      CONSTRAINT [FK_si_tech] FOREIGN KEY ([technician_id]) REFERENCES [technicians] ([technician_id]) ON DELETE NO ACTION,
      CONSTRAINT [FK_si_created_by] FOREIGN KEY ([created_by]) REFERENCES [users] ([user_id]) ON DELETE NO ACTION
    );`;

    try {
      await sequelize.query(invoiceSQL, { raw: true });
      console.log('✅ ServiceInvoice created\n');
    } catch (err) {
      console.log('❌ ServiceInvoice failed');
      if (err.parent?.errors?.[0]) {
        console.log(`   ${err.parent.errors[0].message.substring(0, 100)}`);
      }
      await sequelize.close();
      return;
    }

    // Now add the customer FK via ALTER
    console.log('Adding customer FK to ServiceInvoice...');
    try {
      await sequelize.query(`
        ALTER TABLE [service_invoices]
        ADD CONSTRAINT [FK_si_customer] FOREIGN KEY ([customer_id]) REFERENCES [customers] ([customer_id]) ON DELETE NO ACTION
      `, { raw: true });
      console.log('✅ Customer FK added\n');
    } catch (err) {
      console.log('❌ Customer FK failed');
      if (err.parent?.errors?.[0]) {
        console.log(`   ${err.parent.errors[0].message.substring(0, 100)}`);
      }
    }

    // Create ServiceInvoiceItem
    console.log('Creating ServiceInvoiceItem...');
    const itemSQL = `CREATE TABLE [service_invoice_items] (
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
    );`;

    try {
      await sequelize.query(itemSQL, { raw: true });
      console.log('✅ ServiceInvoiceItem created\n');
    } catch (err) {
      console.log('❌ ServiceInvoiceItem failed');
      if (err.parent?.errors?.[0]) {
        console.log(`   ${err.parent.errors[0].message.substring(0, 100)}`);
      }
    }

    // Verify
    const verify = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_TYPE='BASE TABLE' AND TABLE_SCHEMA='dbo'`,
      { raw: true, type: sequelize.QueryTypes.SELECT }
    );
    
    console.log(`📊 Total tables: ${verify[0].cnt}`);
    if (verify[0].cnt === 54) {
      console.log('\n🎉 ✨ ALL 54 MODELS SUCCESSFULLY SYNCED! ✨ 🎉');
    }

    await sequelize.close();
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

main();
