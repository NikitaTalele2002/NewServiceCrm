import sql from 'mssql';

const dbConfig = {
  server: 'localhost',
  user: 'crm_user',
  password: 'StrongPassword123!',
  database: 'ServiceCrm',
  options: {
    instanceName: 'SQLEXPRESS',
    encrypt: false,
    trustServerCertificate: true,
  }
};

async function checkColumns() {
  const pool = new sql.ConnectionPool(dbConfig);
  try {
    await pool.connect();
    
    // Check columns
    const colResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'spare_parts'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('spare_parts table columns:\n');
    for (const col of colResult.recordset) {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    }
    
    // Now check the spare_parts table for the IDs we need
    console.log('\nData in spare_parts for IDs 1111, 1131, 434, 608, 260:\n');
    const dataResult = await pool.request().query(`
      SELECT Id, SpareName, SKU
      FROM spare_parts
      WHERE Id IN (1111, 1131, 434, 608, 260)
      ORDER BY Id
    `);
    
    for (const row of dataResult.recordset) {
      console.log(`  ID: ${row.Id}, Name: ${row.SpareName}, SKU: ${row.SKU}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.close();
  }
}

checkColumns();
