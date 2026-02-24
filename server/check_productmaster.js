import { sequelize, ProductMaster } from './models/index.js';

async function check() {
  try {
    console.log('\n=== Checking ProductMaster Table ===\n');

    // Check table existence and row count
    const [result] = await sequelize.query(`
      SELECT TABLE_NAME, TABLE_TYPE 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'ProductMaster' 
      OR TABLE_NAME = 'products'
    `);
    console.log('Tables found:', result);

    // Count rows in ProductMaster
    const [countResult] = await sequelize.query(`SELECT COUNT(*) as cnt FROM ProductMaster`);
    console.log('Row count in ProductMaster:', countResult[0].cnt);

    // Fetch sample rows
    const [sampleRows] = await sequelize.query(`
      SELECT TOP 5 ID, VALUE, DESCRIPTION, Product_group_ID 
      FROM ProductMaster 
      ORDER BY ID
    `);
    console.log('Sample rows:', sampleRows);

    // Check for null Product_group_ID
    const [nullCheck] = await sequelize.query(`
      SELECT COUNT(*) as cnt FROM ProductMaster WHERE Product_group_ID IS NULL
    `);
    console.log('Rows with NULL Product_group_ID:', nullCheck[0].cnt);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
