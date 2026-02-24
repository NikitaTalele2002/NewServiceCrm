/**
 * Create test allocated spare requests for rental return testing
 * These are spare requests that have been approved and allocated to technicians
 */

import { sequelize } from './db.js';
import { SpareRequest, SpareRequestItem, SparePart, Technicians } from './models/index.js';

async function createAllocatedTestData() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  🧪 CREATE ALLOCATED SPARE REQUESTS FOR RENTAL RETURN      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // Step 1: Get technicians
    console.log('📝 STEP 1: Fetching technicians...');
    const technicians = await Technicians.findAll({ limit: 3, transaction });
    if (technicians.length === 0) {
      throw new Error('No technicians found');
    }
    console.log(`✅ Found ${technicians.length} technicians`);
    technicians.forEach(t => console.log(`   - ${t.TechnicianName} (ID: ${t.Id}, SC: ${t.ServiceCentreId})`));
    
    // Step 2: Get spare parts
    console.log('\n📦 STEP 2: Fetching spare parts...');
    const spareParts = await SparePart.findAll({ limit: 8, transaction });
    if (spareParts.length === 0) {
      throw new Error('No spare parts found');
    }
    console.log(`✅ Found ${spareParts.length} spare parts`);
    
    // Step 3: Create allocated requests
    console.log('\n🎲 STEP 3: Creating allocated spare requests...\n');
    
    const allocatedRequests = [];
    for (let i = 0; i < 3; i++) {
      const technician = technicians[i % technicians.length];
      const randomSpares = spareParts.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2));
      
      // Create request
      const request = await SpareRequest.create({
        ServiceCenterId: technician.ServiceCentreId,
        TechnicianId: technician.Id,
        RequestNumber: `ALLOC-${Date.now()}-${i}`,
        Status: 'Allocated',
        ReturnType: 'normal',
        Notes: 'Allocated for technician use',
        CreatedAt: new Date(),
        UpdatedAt: new Date()
      }, { transaction });
      
      console.log(`   📌 Allocated Request #${request.Id}`);
      console.log(`      Technician: ${technician.TechnicianName}`);
      console.log(`      Service Center: ${technician.ServiceCentreId}`);
      
      // Create items for this request
      for (const spare of randomSpares) {
        const qty = 2 + Math.floor(Math.random() * 3);
        await SpareRequestItem.create({
          RequestId: request.Id,
          Sku: spare.SparePart_code || spare.Id,
          SpareName: spare.SparePart_name,
          RequestedQty: qty,
          ApprovedQty: qty,
          CreatedAt: new Date()
        }, { transaction });
        
        console.log(`      ├─ ${spare.SparePart_name} (Qty: ${qty})`);
      }
      
      allocatedRequests.push(request);
    }
    
    await transaction.commit();
    
    console.log('\n✅ Allocated requests created successfully!\n');
    
    // Step 4: Verify
    console.log('📋 STEP 4: Verifying allocated requests...\n');
    const verify = await sequelize.query(`
      SELECT sr.Id, sr.RequestNumber, sr.Status, t.TechnicianName, COUNT(sri.Id) as item_count
      FROM SpareRequests sr
      LEFT JOIN Technicians t ON sr.TechnicianId = t.Id
      LEFT JOIN SpareRequestItems sri ON sr.Id = sri.RequestId
      WHERE sr.Status = 'Allocated'
      GROUP BY sr.Id, sr.RequestNumber, sr.Status, t.TechnicianName
      ORDER BY sr.CreatedAt DESC
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log(`✅ Found ${verify.length} allocated requests:\n`);
    verify.forEach(req => {
      console.log(`   ID: ${req.Id}`);
      console.log(`   Request#: ${req.RequestNumber}`);
      console.log(`   Technician: ${req.TechnicianName}`);
      console.log(`   Items: ${req.item_count}`);
      console.log(`   Status: ${req.Status}\n`);
    });
    
    console.log('\n🎉 Test data ready for rental return page!\n');
    console.log('📌 API Endpoint: GET /api/spare-requests?status=Allocated\n');
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

createAllocatedTestData();
