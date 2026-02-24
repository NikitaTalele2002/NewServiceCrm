/**
 * Get actual error details with full error logging
 */

import { sequelize } from './db.js';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Testing error details...\n');

    // Try just one simple table first
    const sql = `CREATE TABLE [test_ledger] (
      [ledger_id] INT IDENTITY(1,1) PRIMARY KEY,
      [asc_id] INT NOT NULL,
      [created_at] DATETIMEOFFSET,
      CONSTRAINT [FK_test] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE
    );`;

    console.log('Executing SQL...\n');
    try {
      const result = await sequelize.query(sql, { raw: true });
      console.log('✅ Success!');
      console.log('Result:', result);
    } catch (err) {
      console.log('❌ FAILED\n');
      console.log('Full error object:');
      console.log(JSON.stringify(err, null, 2));
      
      console.log('\n\nError properties:');
      for (const key in err) {
        console.log(`${key}:`, typeof err[key] === 'object' ? JSON.stringify(err[key]) : err[key]);
      }
      
      if (err.parent) {
        console.log('\n\nParent error details:');
        console.log(err.parent);
      }
      
      if (err.original) {
        console.log('\n\nOriginal error details:');
        console.log(err.original);
      }
    }

    await sequelize.close();
  } catch (err) {
    console.error('Fatal:', err.message);
  }
}

main();
