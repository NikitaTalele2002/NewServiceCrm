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

async function checkCustomerProducts() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    console.log('✅ Connected to database\n');

    // Check customers_products table schema
    const schemaResult = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'customers_products'
    `);

    console.log('📊 customers_products columns:');
    schemaResult.recordset.forEach(c => {
      console.log(`  - ${c.COLUMN_NAME}`);
    });

    // Now get data
    const result = await pool.request().query(`
      SELECT TOP 10 *
      FROM customers_products
    `);

    console.log('📊 Available Customer-Product Associations:');
    console.log('────────────────────────────');
    if (result.recordset.length === 0) {
      console.log('⚠️  No customer-product associations found!');
      
      // Check what products exist
      const products = await pool.request().query(`
        SELECT TOP 5 product_id, name FROM ProductMaster ORDER BY product_id
      `);
      console.log('\n📦 Available Products:');
      products.recordset.forEach(p => {
        console.log(`  ID: ${p.product_id} | Name: ${p.name}`);
      });
    } else {
      result.recordset.forEach(cp => {
        console.log(`ID: ${cp.id} | Customer: ${cp.customer_id} | Product: ${cp.product_id} (${cp.product_name})`);
      });
    }

    console.log('\n✓ Total associations:', result.recordset.length);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

checkCustomerProducts();
