#!/usr/bin/env node

import sql from 'mssql';

const config = {
  server: 'localhost\\SQLEXPRESS',
  database: 'NewCRM',
  user: 'crm_user',
  password: 'StrongPassword123!',
  options: {
    trustServerCertificate: true,
    encrypt: false
  }
};

async function checkCallsTable() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    console.log('✅ Connected to database\n');

    const result = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'calls'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('📊 Columns in calls table:');
    console.log('────────────────────────────');
    result.recordset.forEach((c, i) => {
      console.log(`${i + 1}. ${c.COLUMN_NAME}`);
    });

    console.log(`\n✓ Total columns: ${result.recordset.length}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

checkCallsTable();
