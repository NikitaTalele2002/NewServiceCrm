/**
 * Final comprehensive verification of DN and QTY fixes
 */

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
    enableKeepAlive: true,
  }
};

async function verifyFixes() {
  const pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();

  console.log('\n✅ === COMPREHENSIVE VERIFICATION OF DN AND QTY FIXES ===\n');

  // Get all stock movements for Request 24 and show the progression
  const movementsResult = await pool.request().query(
    `SELECT movement_id, reference_no, total_qty, created_at, status
     FROM stock_movement 
     WHERE reference_type = 'spare_request' 
     AND reference_no LIKE '%DN-20260216%'
     ORDER BY movement_id DESC`
  );

  console.log('📋 Stock Movement Records for DN-20260216-XRKKV:\n');
  console.log('Movement ID | Reference No (DN)          | Total Qty | Status | Created At');
  console.log('------------|----------------------------|-----------|--------|------------------');

  let correctCount = 0;
  let incorrectCount = 0;
  const dnCorrect = 'DN-20260216-XRKKV';

  for (const movement of movementsResult.recordset) {
    const isCorrect = movement.reference_no === dnCorrect;
    const status = isCorrect ? '✅ CORRECT' : '❌ WRONG (duplicated)';
    
    if (isCorrect) correctCount++;
    else incorrectCount++;

    const createdAt = movement.created_at ? movement.created_at.toISOString().split('T')[0] : 'N/A';
    
    console.log(`${String(movement.movement_id).padEnd(11)} | ${movement.reference_no.padEnd(28)} | ${String(movement.total_qty).padEnd(10)} | ${status} | ${createdAt}`);
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Correct DN format (no duplication): ${correctCount} records`);
  console.log(`  ❌ Old buggy format (with duplication): ${incorrectCount} records`);

  // Show the most recent one in detail
  if (movementsResult.recordset.length > 0) {
    const latest = movementsResult.recordset[0];
    console.log('\n🔍 Latest Movement Details:');
    console.log(`  movement_id: ${latest.movement_id}`);
    console.log(`  reference_no: ${latest.reference_no}`);
    console.log(`  Expected: ${dnCorrect}`);
    console.log(`  Status: ${latest.reference_no === dnCorrect ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`  total_qty: ${latest.total_qty}`);
    console.log(`  Status: ${latest.status}`);
  }

  // Check goods_movement_items for latest movement
  if (movementsResult.recordset.length > 0) {
    const latestMovementId = movementsResult.recordset[0].movement_id;
    
    console.log(`\n📋 Goods Movement Items for Movement ${latestMovementId}:\n`);
    
    const itemsResult = await pool.request().query(
      `SELECT movement_item_id, spare_part_id, qty, condition, created_at
       FROM goods_movement_items 
       WHERE movement_id = ${latestMovementId}`
    );

    console.log('Item ID | Spare ID | Qty | Condition');
    console.log('--------|----------|-----|----------');
    
    for (const item of itemsResult.recordset) {
      console.log(`${String(item.movement_item_id).padEnd(8)} | ${String(item.spare_part_id).padEnd(9)} | ${String(item.qty).padEnd(5)} | ${item.condition}`);
    }

    const totalItemQty = itemsResult.recordset.reduce((sum, item) => sum + item.qty, 0);
    console.log(`\nTotal Qty from items: ${totalItemQty}`);
    console.log(`Movement total_qty: ${movementsResult.recordset[0].total_qty}`);
    console.log(`Match: ${totalItemQty === movementsResult.recordset[0].total_qty ? '✅ YES' : '❌ NO'}`);
  }

  await pool.close();

  console.log('\n✅ Verification Complete!\n');
}

verifyFixes().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
