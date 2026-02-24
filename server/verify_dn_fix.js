/**
 * Verify DN Fix: Ensure stock_movement.reference_no matches logistics_documents.document_number
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

async function verifyDNFix() {
  const pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();

  console.log('\n✅ === VERIFYING DN FIX ===\n');

  // Get logistics documents with their DNs
  console.log('📋 Logistics Documents (SAP-Generated DNs):');
  console.log('━═━━═━━━━━━━━━━━━━━━━━━━━━\n');

  const logisticsResult = await pool.request().query(`
    SELECT TOP 5
      ld.id,
      ld.reference_id,
      ld.document_number,
      ld.status,
      ld.created_at
    FROM logistics_documents ld
    WHERE ld.reference_type = 'SPARE_REQUEST'
      AND ld.document_type = 'DN'
    ORDER BY ld.created_at DESC
  `);

  console.log(`Total DN documents found: ${logisticsResult.recordset.length}\n`);

  let matchCount = 0;
  let mismatchCount = 0;

  for (const logDoc of logisticsResult.recordset) {
    const { id, reference_id, document_number } = logDoc;
    
    console.log(`📌 Logistics Doc ID ${id} (Request ${reference_id}):`);
    console.log(`   SAP-Generated DN: ${document_number}`);

    // Find stock_movement with this DN
    const movementResult = await pool.request().query(`
      SELECT TOP 1
        sm.movement_id,
        sm.reference_no,
        sm.source_location_id,
        sm.destination_location_id,
        sm.total_qty,
        sm.created_at
      FROM stock_movement sm
      WHERE sm.reference_no = '${document_number}'
        AND sm.reference_type = 'spare_request'
      ORDER BY sm.created_at DESC
    `);

    if (movementResult.recordset.length > 0) {
      const movement = movementResult.recordset[0];
      const match = movement.reference_no === document_number ? '✅ MATCH' : '❌ MISMATCH';
      
      console.log(`   Stock Movement ${movement.movement_id}:`);
      console.log(`   reference_no: ${movement.reference_no} ${match}`);
      console.log(`   Route: ${movement.source_location_id} → ${movement.destination_location_id}`);
      console.log(`   Qty: ${movement.total_qty}`);
      
      if (movement.reference_no === document_number) {
        matchCount++;
      } else {
        mismatchCount++;
      }
    } else {
      console.log(`   ⚠️ No stock_movement found with this DN`);
    }
    console.log();
  }

  console.log('\n✅ === SUMMARY ===');
  console.log(`✅ Matched: ${matchCount}`);
  console.log(`❌ Mismatched: ${mismatchCount}`);
  console.log();

  await pool.close();
}

try {
  await verifyDNFix();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
