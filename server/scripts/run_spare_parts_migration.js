import sql from 'mssql';

const config = {
  server: 'localhost\\SQLEXPRESS',
  database: 'ServiceCrm',
  authentication: {
    type: 'default',
    options: {
      userName: 'crm_user',
      password: 'StrongPassword123!'
    }
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableKeepAlive: true,
    useUTC: true,
    instanceName: 'SQLEXPRESS'
  }
};

const migrations = [
  'ALTER TABLE SpareParts ADD DESCRIPTION VARCHAR(255) NULL;',
  'ALTER TABLE SpareParts ADD MAPPED_MODEL VARCHAR(50) NULL;',
  'ALTER TABLE SpareParts ADD MODEL_DESCRIPTION VARCHAR(255) NULL;',
  'ALTER TABLE SpareParts ADD MAX_USED_QTY INT NULL;',
  'ALTER TABLE SpareParts ADD SERVICE_LEVEL VARCHAR(50) NULL;',
  'ALTER TABLE SpareParts ADD PART_LOCATION VARCHAR(100) NULL;',
  'ALTER TABLE SpareParts ADD STATUS VARCHAR(50) NULL;',
  'ALTER TABLE SpareParts ADD LAST_UPDATED_DATE DATETIME NULL;'
];

(async () => {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✓ Connected to ServiceCrm database');

    for (const migration of migrations) {
      try {
        await pool.query(migration);
        const col = migration.match(/ADD (\w+)/)[1];
        console.log(`✓ Added column: ${col}`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          const col = migration.match(/ADD (\w+)/)[1];
          console.log(`⚠ Column already exists: ${col}`);
        } else {
          console.error(`✗ Error adding ${migration.match(/ADD (\w+)/)[1]}: ${err.message}`);
        }
      }
    }

    // Verify columns
    const result = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'SpareParts' 
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\n📋 SpareParts table columns:');
    result.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    await pool.close();
    console.log('\n✓ Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Connection Error:', err.message);
    process.exit(1);
  }
})();
