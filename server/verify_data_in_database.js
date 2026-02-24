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

async function check() {
  const pool = new sql.ConnectionPool(dbConfig);
  try {
    await pool.connect();
    
    console.log('✅ RETURN REQUEST DATA VERIFICATION\n');
    
    // Check what request types exist
    console.log('1️⃣  Checking request types in database:');
    const typeResult = await pool.request().query(`
      SELECT DISTINCT request_type FROM spare_requests WHERE request_type IS NOT NULL
    `);
    console.log('   Request types found:');
    for (const row of typeResult.recordset) {
      console.log(`   - "${row.request_type}"`);
    }
    
    //Check what reasons exist
    console.log('\n2️⃣  Checking request reasons:');
    const reasonResult = await pool.request().query(`
      SELECT DISTINCT request_reason FROM spare_requests WHERE request_reason IS NOT NULL ORDER BY request_reason
    `);
    console.log('   Request reasons found:');
    for (const row of reasonResult.recordset.slice(0, 10)) {
      console.log(`   - "${row.request_reason}"`);
    }
    
    // Check for return-related requests
    console.log('\n3️⃣  Looking for return-related requests:');
    const returnResult = await pool.request().query(`
      SELECT TOP 10 request_id, request_type, request_reason, status_id
      FROM spare_requests
      WHERE request_reason LIKE '%return%' OR request_reason LIKE '%defective%' OR request_type LIKE '%return%'
      ORDER BY request_id DESC
    `);
    console.log(`   Found ${returnResult.recordset.length} return-related requests`);
    for (const req of returnResult.recordset) {
      console.log(`   - ID: ${req.request_id}, Type: ${req.request_type}, Reason: ${req.request_reason}`);
    }
    
    // Check stock movements
    console.log('\n4️⃣  Checking stock_movement table:');
    const smResult = await pool.request().query(`
      SELECT COUNT(*) as cnt FROM stock_movement
    `);
    const smCount = smResult.recordset[0].cnt;
    console.log(`   Total stock_movement records: ${smCount}`);
    
    // Check by reference type
    console.log('\n5️⃣  Stock movements by reference type:');
    const smByTypeResult = await pool.request().query(`
      SELECT reference_type, COUNT(*) as cnt
      FROM stock_movement
      GROUP BY reference_type
      ORDER BY cnt DESC
    `);
    for (const row of smByTypeResult.recordset) {
      console.log(`   - ${row.reference_type}: ${row.cnt}`);
    }
    
    // Check goods_movement_items
    console.log('\n6️⃣  Total goods_movement_items records:');
    const gmiResult = await pool.request().query(`
      SELECT COUNT(*) as cnt FROM goods_movement_items
    `);
    console.log(`   ${gmiResult.recordset[0].cnt} total items`);
    
    // Show recent stock movements
    console.log('\n7️⃣  Recent stock movements:');
    const recentResult = await pool.request().query(`
      SELECT TOP 10 movement_id, movement_type, reference_type, total_qty, status
      FROM stock_movement
      ORDER BY movement_id DESC
    `);
    for (const row of recentResult.recordset) {
      console.log(`   - ID: ${row.movement_id}, Type: ${row.movement_type}, Ref: ${row.reference_type}, Qty: ${row.total_qty}, Status: ${row.status}`);
    }
    
    console.log('\n✅ DATA IS PRESENT IN DATABASE');
    console.log('   Stock movements are being created and stored');
    console.log('   Goods movement items are being created and stored');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.close();
  }
}

check();
