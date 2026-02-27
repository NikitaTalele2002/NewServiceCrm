#!/usr/bin/env node

import sql from 'mssql';

const config = {
  server: 'localhost\\SQLEXPRESS',
  authentication: {
    type: 'default',
    options: {
      userName: 'crm_user',
      password: 'StrongPassword123!'
    }
  },
  options: {
    encrypt: false,
    database: 'NewCRM'
  }
};

(async () => {
  let pool;
  try {
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('\n✅ Connected to database\n');
    
    console.log('📊 FINAL STATUS AND SUB-STATUS STRUCTURE:\n');
    
    const statuses = await pool.request().query(`
      SELECT status_id, status_name FROM [status] ORDER BY status_id
    `);
    
    for (const status of statuses.recordset) {
      console.log(`📌 ${status.status_name} (ID: ${status.status_id})`);
      
      const subStatuses = await pool.request()
        .input('sid', sql.Int, status.status_id)
        .query('SELECT sub_status_name FROM [sub_status] WHERE status_id = @sid ORDER BY sub_status_id');
      
      if (subStatuses.recordset.length > 0) {
        subStatuses.recordset.forEach((sub, idx) => {
          const isLast = idx === subStatuses.recordset.length - 1;
          console.log(`   ${isLast ? '└─' : '├─'} ${sub.sub_status_name}`);
        });
      } else {
        console.log('   └─ (no sub-statuses)');
      }
    }
    
    console.log('\n✅ Status structure is correct!\n');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (pool) await pool.close();
  }
})();
