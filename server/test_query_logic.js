/**
 * Test database query for allocated requests
 */
import { sequelize } from './db.js';

async function test() {
  try {
    console.log('🧪 Testing allocated requests database query\n');
    
    // Test 1: Check if status table has correct mappings
    console.log('1️⃣ Checking status table mappings...');
    const statuses = await sequelize.query(`
      SELECT status_id, status_name FROM status WHERE status_name IN ('Allocated', 'pending')
    `, { type: sequelize.QueryTypes.SELECT });
    console.log('Status mappings:');
    statuses.forEach(s => console.log(`  - ${s.status_name}: ${s.status_id}`));
    
    // Test 2: Query for allocated requests (status_id = 3)
    console.log('\n2️⃣ Querying allocated requests...');
    const query = `
      SELECT 
        sr.request_id as id,
        sr.request_id as requestNumber,
        sr.status_id as statusId,
        sr.request_type as type,
        sr.created_at as createdAt,
        sr.requested_source_id as technicianId,
        t.name as technicianName,
        sr.requested_to_id as serviceCenterId
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      WHERE sr.status_id = 3 AND sr.requested_source_type = 'technician'
      ORDER BY sr.created_at DESC
    `;
    
    const results = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log(`✅ Found ${results.length} allocated requests\n`);
    
    if (results.length > 0) {
      results.slice(0, 3).forEach((r, i) => {
        console.log(`Request ${i + 1}:`);
        console.log(`  ID: ${r.id}`);
        console.log(`  Technician: ${r.technicianName} (${r.technicianId})`);
        console.log(`  Service Center: ${r.serviceCenterId}`);
        console.log(`  Created: ${r.createdAt}`);
        
        // Get items for this request
      });
    }
    
    // Test 3: Check items for a request
    if (results.length > 0) {
      console.log(`\n3️⃣ Checking items for request #${results[0].id}...`);
      const items = await sequelize.query(
        'SELECT id, spare_id, requested_qty, approved_qty FROM spare_request_items WHERE request_id = ?',
        {
          replacements: [results[0].id],
          type: sequelize.QueryTypes.SELECT
        }
      );
      console.log(`Found ${items.length} items`);
      items.forEach(item => {
        console.log(`  - Spare ID ${item.spare_id}: ${item.requested_qty} requested, ${item.approved_qty} approved`);
      });
    }
    
    // Test 4: Raw test of filter logic like the route uses
    console.log('\n4️⃣ Testing filter logic (status=Allocated, SC=4)...');
    const whereConditions = [];
    const replacements = [];
    
    whereConditions.push('sr.status_id = ?');
    replacements.push(3);
    
    whereConditions.push('sr.requested_to_id = ?');
    replacements.push(4);
    
    whereConditions.push('sr.requested_source_type = ?');
    replacements.push('technician');
    
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    
    const filteredQuery = `
      SELECT 
        sr.request_id as id,
        sr.request_id as requestNumber,
        sr.status_id as statusId,
        sr.request_type as type,
        sr.created_at as createdAt,
        sr.requested_source_id as technicianId,
        t.name as technicianName,
        sr.requested_to_id as serviceCenterId
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      ${whereClause}
      ORDER BY sr.created_at DESC
    `;
    
    const filtered = await sequelize.query(filteredQuery, {
      replacements: replacements,
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log(`✅ With SC filter: ${filtered.length} requests`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.errors) {
      console.error('\nSQL Errors:');
      error.errors.forEach(e => console.log('  -', e.message));
    }
  } finally {
    await sequelize.close();
  }
}

test();
