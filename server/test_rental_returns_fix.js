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
    for (const req of rawResult.recordset) {
      console.log(`   Request ID: ${req.request_id}`);
      console.log(`   ├─ From: Technician ${req.requested_source_id}`);
      console.log(`   ├─ To: ${req.requested_to_type} (${req.requested_to_id})`);
      console.log(`   ├─ Reason: ${req.request_reason}`);
      console.log(`   ├─ Status ID: ${req.status_id}`);
      console.log(`   └─ Created: ${req.created_at}\n`);
    }
    
    // Check if request_id 80 exists
    const req80 = rawResult.recordset.find(r => r.request_id === 80);
    if (req80) {
      console.log(`✅ Request ID 80 found in database as a technician return request`);
    } else {
      console.log(`❌ Request ID 80 NOT found as technician return request`);
    }
    
    console.log('\n' + '═'.repeat(70));
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
    
    console.log(`   ✓ Found ${requests.length} technician return requests via ORM\n`);
    
    const formatted = [];
    for (const request of requests) {
      const requestItems = await SpareRequestItem.findAll({
        where: { request_id: request.request_id },
        include: [
          {
            model: SparePart,
            as: 'SparePart',
            attributes: ['Id', 'SpareName', 'Sku']
          }
        ]
      });

      for (const item of requestItems) {
        formatted.push({
          request_id: request.request_id,
          call_id: request.call_id,
          technicianId: request.requested_source_id,
          status: request.status?.status_name || 'Unknown',
          spareName: item.SparePart?.SpareName || 'Unknown',
          quantity: item.requested_qty || 0
        });
      }
    }
    
    console.log(`   Total items in formatted list: ${formatted.length}\n`);
    
    // Show recent entries
    console.log('   Recent rental returns (first 10):');
    for (const item of formatted.slice(0, 10)) {
      console.log(`   ├─ Request ${item.request_id}: ${item.spareName} (Qty: ${item.quantity})`);
    }
    
    // Check if request 80 appears
    const req80Items = formatted.filter(item => item.request_id === 80);
    if (req80Items.length > 0) {
      console.log(`\n   ✅ Request 80 is included! (${req80Items.length} items)`);
      for (const item of req80Items) {
        console.log(`      - ${item.spareName} (Qty: ${item.quantity})`);
      }
    } else {
      console.log(`\n   ❌ Request 80 is NOT included in results`);
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('3️⃣  Summary:\n');
    console.log(`   Total technician return requests: ${requests.length}`);
    console.log(`   Total items to return: ${formatted.length}`);
    console.log(`   Request 80 status: ${req80Items.length > 0 ? '✅ NOW VISIBLE' : '❌ NOT VISIBLE'}`);
    
    await pool.close();
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testRentalReturns();
