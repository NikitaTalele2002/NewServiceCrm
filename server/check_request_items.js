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

async function checkItems() {
  const pool = new sql.ConnectionPool(dbConfig);
  try {
    await pool.connect();
    
    console.log('🔍 Checking spare_request_items for request_id 80 and 81\n');
    console.log('═'.repeat(70));
    
    // Check what items exist
    const itemsResult = await pool.request().query(`
      SELECT id, request_id, spare_id, requested_qty, approved_qty
      FROM spare_request_items
      WHERE request_id IN (80, 81)
      ORDER BY request_id, id
    `);
    
    console.log(`Found ${itemsResult.recordset.length} items:\n`);
    for (const item of itemsResult.recordset) {
      console.log(`ID: ${item.id}, Request: ${item.request_id}, Spare: ${item.spare_id}, Qty: ${item.requested_qty}`);
    }
    
    if (itemsResult.recordset.length === 0) {
      console.log('\n❌ No items found for requests 80 and 81');
      console.log('   This would explain why they don\'t show on rental return page');
    } else {
      console.log('\n✅ Items found! Now checking if spare_id references exist...\n');
      
      // Check spare_parts
      const spareIds = [...new Set(itemsResult.recordset.map(i => i.spare_id))];
      console.log('Spare IDs to check:', spareIds);
      
      const sparesResult = await pool.request().query(`
        SELECT Id, SpareName, Sku
        FROM spare_parts
        WHERE Id IN (${spareIds.join(',')})
      `);
      
      console.log(`\nFound ${sparesResult.recordset.length} spares in spare_parts table:`);
      for (const spare of sparesResult.recordset) {
        console.log(`  ID: ${spare.Id}, Name: ${spare.SpareName}, SKU: ${spare.Sku}`);
      }
      
      const missingIds = spareIds.filter(id => !sparesResult.recordset.find(s => s.Id === id));
      if (missingIds.length > 0) {
        console.log(`\n❌ Missing spare_parts: ${missingIds.join(', ')}`);
        console.log('   This could cause the join to fail');
      }
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('ℹ️  Note: If there are no items, those requests need to be updated');
    console.log('      with spare items before they can appear on rental return page.');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.close();
  }
}

checkItems();
