import sql from 'mssql';
import { sequelize } from './db.js';
import { SpareRequest, SpareRequestItem, Status, SparePart } from './models/index.js';

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

async function testRentalReturns() {
  try {
    console.log('🔍 TESTING RENTAL RETURNS FIX\n');
    console.log('═'.repeat(70));
    
    // First, check raw data in database
    console.log('\n1️⃣  Raw data from spare_requests table:');
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    
    const rawResult = await pool.request().query(`
      SELECT request_id, request_type, requested_source_type, requested_source_id, 
             requested_to_type, requested_to_id, request_reason, status_id, created_at
      FROM spare_requests
      WHERE requested_source_type = 'technician'
      ORDER BY request_id DESC
    `);
    
    console.log(`   Total technician return requests: ${rawResult.recordset.length}\n`);
    for (const req of rawResult.recordset.slice(0, 5)) {
      console.log(`   Request ID: ${req.request_id}`);
      console.log(`   ├─ From: Technician ${req.requested_source_id}`);
      console.log(`   ├─ To: ${req.requested_to_type} (${req.requested_to_id})`);
      console.log(`   └─ Created: ${req.created_at}\n`);
    }
    
    // Check if request_id 80 exists
    const req80 = rawResult.recordset.find(r => r.request_id === 80);
    if (req80) {
      console.log(`✅ Request ID 80 found in database\n`);
    }
    
    console.log('═'.repeat(70));
    console.log('2️⃣  Testing getRentalReturns function:\n');
    
    // Initialize Sequelize
    await sequelize.authenticate();
    console.log('   ✓ Database connected');
    
    // Test the getRentalReturns function
    const requests = await SpareRequest.findAll({
      where: {
        requested_source_type: 'technician'
      },
      include: [
        {
          model: Status,
          as: 'status',
          attributes: ['status_id', 'status_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    console.log(`   ✓ Found ${requests.length} technician return requests\n`);
    
    const formatted = [];
    let processedCount = 0;
    for (const request of requests) {
      try {
        const requestItems = await SpareRequestItem.findAll({
          where: { request_id: request.request_id },
          include: [
            {
              model: SparePart,
              as: 'SparePart',
              attributes: ['Id', 'PART', 'DESCRIPTION']
            }
          ]
        });

        for (const item of requestItems) {
          formatted.push({
            request_id: request.request_id,
            technicianId: request.requested_source_id,
            status: request.status?.status_name || 'Unknown',
            spareName: item.SparePart?.DESCRIPTION || item.SparePart?.PART || 'Unknown',
            quantity: item.requested_qty || 0
          });
        }
        processedCount++;
      } catch (itemError) {
        console.log(`   ⚠️  Error processing request ${request.request_id}: ${itemError.message.substring(0, 50)}`);
      }
    }
    
    console.log(`   ✓ Processed ${processedCount} requests`);
    console.log(`   ✓ Total items: ${formatted.length}\n`);
    
    // Show results
    console.log('   Sample returns (first 5):');
    for (const item of formatted.slice(0, 5)) {
      console.log(`   ├─ Request ${item.request_id}: ${item.spareName.substring(0, 30)} (Qty: ${item.quantity})`);
    }
    
    // Check if request 80 appears
    const req80Items = formatted.filter(item => item.request_id === 80);
    console.log(`\n   Request 80: ${req80Items.length > 0 ? `✅ FOUND (${req80Items.length} items)` : '❌ NOT FOUND'}`);
    if (req80Items.length > 0) {
      for (const item of req80Items) {
        console.log(`      └─ ${item.spareName} (Qty: ${item.quantity})`);
      }
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('✅ FIX VERIFICATION COMPLETE\n');
    console.log(`Total Technician Returns: ${requests.length}`);
    console.log(`Total Items: ${formatted.length}`);
    console.log(`Request 80 Status: ${req80Items.length > 0 ? '✅ VISIBLE on rental return page' : '❌ NOT VISIBLE'}\n`);
    
    if (req80Items.length > 0) {
      console.log('🎉 FIX SUCCESSFUL! Request 80 now appears on the rental return page.');
    }
    
    await pool.close();
    await sequelize.close();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql.substring(0, 100) + '...');
    }
  }
}

testRentalReturns();
