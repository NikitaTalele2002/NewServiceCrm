#!/usr/bin/env node

const sql = require('mssql');

const config = {
  server: '127.0.0.1',
  port: 1433,
  database: 'NewCRM',
  user: 'sa',
  password: 'root@123',
  options: {
    trustServerCertificate: true,
    encrypt: false
  }
};

async function checkCustomers() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    console.log('✅ Connected to database\n');

    const result = await pool.request().query(`
      SELECT TOP 10 customer_id, name, mobile_number 
      FROM customers 
      ORDER BY customer_id
    `);

    console.log('📊 Available Customers:');
    console.log('────────────────────────────');
    result.recordset.forEach(c => {
      console.log(`ID: ${c.customer_id} | Name: ${c.name} | Mobile: ${c.mobile_number}`);
    });

    if (result.recordset.length === 0) {
      console.log('⚠️  No customers found!');
      process.exit(1);
    }

    console.log('\n✓ Total customers:', result.recordset.length);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

checkCustomers();
