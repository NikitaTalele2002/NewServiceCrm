import { sequelize } from './db.js';

/**
 * Deep error investigation for table creation failures
 */

const testTablesSql = [
  {
    name: 'Ledger (simplified)',
    sql: `DROP TABLE IF EXISTS [ledger_test];
    CREATE TABLE [ledger_test] (
      [ledger_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [asc_id] INTEGER NOT NULL,
      [transaction_type] VARCHAR(20),
      [created_at] DATETIMEOFFSET NULL
    );`
  },
  {
    name: 'Ledger (with FK)',
    sql: `DROP TABLE IF EXISTS [ledger_test];
    CREATE TABLE [ledger_test] (
      [ledger_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [asc_id] INTEGER NOT NULL,
      [transaction_type] VARCHAR(20),
      [created_at] DATETIMEOFFSET NULL,
      FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id])
    );`
  },
  {
    name: 'Technicians (simple)',
    sql: `DROP TABLE IF EXISTS [technicians_test];
    CREATE TABLE [technicians_test] (
      [technician_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [name] NVARCHAR(150) NOT NULL,
      [mobile_no] NVARCHAR(20) UNIQUE
    );`
  },
  {
    name: 'Technicians (with FKs)',
    sql: `DROP TABLE IF EXISTS [technicians_test];
    CREATE TABLE [technicians_test] (
      [technician_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
      [service_center_id] INTEGER NOT NULL,
      [user_id] INTEGER NOT NULL,
      [name] NVARCHAR(150) NOT NULL,
      [mobile_no] NVARCHAR(20) UNIQUE,
      FOREIGN KEY ([service_center_id]) REFERENCES [service_centers] ([asc_id]),
      FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id])
    );`
  }
];

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected\n');

    for (const test of testTablesSql) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📝 ${test.name}`);
      console.log('='.repeat(60));
      try {
        await sequelize.query(test.sql, { raw: true });
        console.log('✅ SUCCESS');
      } catch (err) {
        console.log('❌ FAILED');
        console.log('\n📋 Full Error Object:');
        console.log(JSON.stringify(err, null, 2));
        console.log('\n🔍 Specific fields:');
        console.log('  name:', err.name);
        console.log('  message:', err.message);
        console.log('  code:', err.code);
        console.log('  number:', err.number);
        console.log('  state:', err.state);
        console.log('  procName:', err.procName);
        if (err.parent) {
          console.log('\n📌 Parent error:');
          console.log('  message:', err.parent.message);
          console.log('  code:', err.parent.code);
          console.log('  number:', err.parent.number);
        }
        if (err.original) {
          console.log('\n📌 Original error:');
          console.log(JSON.stringify(err.original, null, 2));
        }
      }
    }

    await sequelize.close();
  } catch (err) {
    console.error('Fatal:', err.message);
  }
}

main();
