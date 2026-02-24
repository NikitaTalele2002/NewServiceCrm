import { sequelize } from './db.js';

async function main() {
  try {
    await sequelize.authenticate();
    
    // This works
    console.log('Test 1: Self-ref with ON DELETE NO ACTION...');
    try {
      await sequelize.query(`DROP TABLE IF EXISTS [test_ledger];
        CREATE TABLE [test_ledger] (
          [ledger_id] INT IDENTITY(1,1) PRIMARY KEY,
          [asc_id] INT NOT NULL,
          [reversal_ref_id] INT,
          CONSTRAINT [FK_asc] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_self] FOREIGN KEY ([reversal_ref_id]) REFERENCES [test_ledger] ([ledger_id]) ON DELETE NO ACTION
        );`);
      console.log('✅ Works\n');
    } catch (e) {
      console.log('❌ Failed:', e.message || 'empty', '\n');
    }
    
    // This fails
    console.log('Test 2: Adding FK to users with ON DELETE SET NULL...');
    try {
      await sequelize.query(`DROP TABLE IF EXISTS [test_ledger];
        CREATE TABLE [test_ledger] (
          [ledger_id] INT IDENTITY(1,1) PRIMARY KEY,
          [asc_id] INT NOT NULL,
          [reversal_ref_id] INT,
          [reversed_by] INT,
          CONSTRAINT [FK_asc] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_self] FOREIGN KEY ([reversal_ref_id]) REFERENCES [test_ledger] ([ledger_id]) ON DELETE NO ACTION,
          CONSTRAINT [FK_reversed_by] FOREIGN KEY ([reversed_by]) REFERENCES [users] ([user_id]) ON DELETE SET NULL
        );`);
      console.log('✅ Works\n');
    } catch (e) {
      console.log('❌ Failed:', e.message || 'empty', '\n');
    }
    
    // Try without the self-reference
    console.log('Test 3: Just asc_id + reversed_by without self-ref...');
    try {
      await sequelize.query(`DROP TABLE IF EXISTS [test_ledger];
        CREATE TABLE [test_ledger] (
          [ledger_id] INT IDENTITY(1,1) PRIMARY KEY,
          [asc_id] INT NOT NULL,
          [reversed_by] INT,
          CONSTRAINT [FK_asc] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_reversed_by] FOREIGN KEY ([reversed_by]) REFERENCES [users] ([user_id]) ON DELETE SET NULL
        );`);
      console.log('✅ Works\n');
    } catch (e) {
      console.log('❌ Failed:', e.message || 'empty', '\n');
    }

    // Try ALL three FKs but name them explicitly
    console.log('Test 4: ALL three FKs together...');
    try {
      await sequelize.query(`DROP TABLE IF EXISTS [test_ledger];
        CREATE TABLE [test_ledger] (
          [ledger_id] INT IDENTITY(1,1) PRIMARY KEY,
          [asc_id] INT NOT NULL,
          [reversal_ref_id] INT,
          [reversed_by] INT,
          [created_by] INT,
          CONSTRAINT [FK_asc] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_self] FOREIGN KEY ([reversal_ref_id]) REFERENCES [test_ledger] ([ledger_id]) ON DELETE NO ACTION,
          CONSTRAINT [FK_reversed_by] FOREIGN KEY ([reversed_by]) REFERENCES [users] ([user_id]) ON DELETE SET NULL,
          CONSTRAINT [FK_created_by] FOREIGN KEY ([created_by]) REFERENCES [users] ([user_id]) ON DELETE NO ACTION
        );`);
      console.log('✅ Works\n');
    } catch (e) {
      console.log('❌ Failed:', e.message || 'empty', '\n');
      console.log('Full error object keys:', Object.keys(e));
      if (e.parent) console.log('Parent error:', e.parent);
    }

    await sequelize.close();
  } catch (err) {
    console.error('Fatal:', err.message);
  }
}

main();
