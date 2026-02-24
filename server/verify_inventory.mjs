import sql from 'mssql';

(async () => {
  const config = {
    server: 'localhost',
    user: 'crm_user',
    password: 'StrongPassword123!',
    database: 'ServiceCrm',
    options: { instanceName: 'SQLEXPRESS', encrypt: false, trustServerCertificate: true }
  };

  const pool = new sql.ConnectionPool(config);
  await pool.connect();

  console.log('\n📊 === INVENTORY VERIFICATION ===\n');

  // Plant 1 inventory
  const plant1Result = await pool.request().query(
    `SELECT qty_good, qty_defective FROM spare_inventory
     WHERE spare_id = 3 AND location_type = 'branch' AND location_id = 1`
  );

  // ASC 4 inventory
  const asc4Result = await pool.request().query(
    `SELECT qty_good, qty_defective FROM spare_inventory
     WHERE spare_id = 3 AND location_type = 'service_center' AND location_id = 4`
  );

  // Stock movement
  const movementResult = await pool.request().query(
    `SELECT TOP 3 movement_id, status, total_qty, reference_no, created_at
     FROM stock_movement
     ORDER BY created_at DESC`
  );

  console.log('📍 Plant 1 (Source) - Spare 3:');
  if (plant1Result.recordset.length > 0) {
    const inv = plant1Result.recordset[0];
    console.log(`   Good: ${inv.qty_good}, Defective: ${inv.qty_defective}`);
  }

  console.log('\n📍 ASC 4 (ABC Service Center) - Spare 3:');
  if (asc4Result.recordset.length > 0) {
    const inv = asc4Result.recordset[0];
    console.log(`   Good: ${inv.qty_good}, Defective: ${inv.qty_defective}`);
  } else {
    console.log('   No inventory record (might be newly created)');
  }

  console.log('\n📦 Latest Stock Movements:');
  movementResult.recordset.forEach((mov, idx) => {
    console.log(`\n   ${idx + 1}. Movement ${mov.movement_id}`);
    console.log(`      Status: ${mov.status}`);
    console.log(`      Total Qty: ${mov.total_qty}`);
    console.log(`      Reference: ${mov.reference_no}`);
  });

  await pool.close();
  console.log('\n✅ Verification Complete!\n');
})();
