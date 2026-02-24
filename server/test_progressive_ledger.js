/**
 * Test progressively more columns to find what breaks
 */

import { sequelize } from './db.js';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Testing progressively complex Ledger schemas\n');

    const tests = [
      {
        name: 'Simple (just asc_id)',
        sql: `DROP TABLE IF EXISTS [test_ledger];
        CREATE TABLE [test_ledger] (
          [ledger_id] INT IDENTITY(1,1) PRIMARY KEY,
          [asc_id] INT NOT NULL,
          CONSTRAINT [FK1] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE
        );`
      },
      {
        name: 'Add transaction type enum',
        sql: `DROP TABLE IF EXISTS [test_ledger];
        CREATE TABLE [test_ledger] (
          [ledger_id] INT IDENTITY(1,1) PRIMARY KEY,
          [asc_id] INT NOT NULL,
          [transaction_type] VARCHAR(255) CHECK ([transaction_type] IN(N'debit', N'credit')),
          CONSTRAINT [FK1] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE
        );`
      },
      {
        name: 'Add reversal_ref_id self-FK',
        sql: `DROP TABLE IF EXISTS [test_ledger];
        CREATE TABLE [test_ledger] (
          [ledger_id] INT IDENTITY(1,1) PRIMARY KEY,
          [asc_id] INT NOT NULL,
          [transaction_type] VARCHAR(255) CHECK ([transaction_type] IN(N'debit', N'credit')),
          [reversal_ref_id] INT,
          CONSTRAINT [FK1] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_self] FOREIGN KEY ([reversal_ref_id]) REFERENCES [test_ledger] ([ledger_id]) ON DELETE NO ACTION
        );`
      },
      {
        name: 'Add reversed_by FK to users',
        sql: `DROP TABLE IF EXISTS [test_ledger];
        CREATE TABLE [test_ledger] (
          [ledger_id] INT IDENTITY(1,1) PRIMARY KEY,
          [asc_id] INT NOT NULL,
          [transaction_type] VARCHAR(255) CHECK ([transaction_type] IN(N'debit', N'credit')),
          [reversal_ref_id] INT,
          [reversed_by] INT,
          CONSTRAINT [FK1] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_self] FOREIGN KEY ([reversal_ref_id]) REFERENCES [test_ledger] ([ledger_id]) ON DELETE NO ACTION,
          CONSTRAINT [FK2] FOREIGN KEY ([reversed_by]) REFERENCES [users] ([user_id]) ON DELETE SET NULL
        );`
      },
      {
        name: 'Add created_by FK',
        sql: `DROP TABLE IF EXISTS [test_ledger];
        CREATE TABLE [test_ledger] (
          [ledger_id] INT IDENTITY(1,1) PRIMARY KEY,
          [asc_id] INT NOT NULL,
          [transaction_type] VARCHAR(255) CHECK ([transaction_type] IN(N'debit', N'credit')),
          [reversal_ref_id] INT,
          [reversed_by] INT,
          [created_by] INT,
          CONSTRAINT [FK1] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_self] FOREIGN KEY ([reversal_ref_id]) REFERENCES [test_ledger] ([ledger_id]) ON DELETE NO ACTION,
          CONSTRAINT [FK2] FOREIGN KEY ([reversed_by]) REFERENCES [users] ([user_id]) ON DELETE SET NULL,
          CONSTRAINT [FK3] FOREIGN KEY ([created_by]) REFERENCES [users] ([user_id]) ON DELETE NO ACTION
        );`
      }
    ];

    for (const test of tests) {
      try {
        await sequelize.query(test.sql, { raw: true });
        console.log(`✅ ${test.name}`);
      } catch (err) {
        console.log(`❌ ${test.name}`);
        if (err.message) console.log(`   Error: ${err.message.substring(0, 100)}`);
      }
    }

    await sequelize.close();
  } catch (err) {
    console.error('Fatal:', err.message);
  }
}

main();
