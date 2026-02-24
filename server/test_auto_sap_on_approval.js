/**
 * Test: Auto SAP Sync on RSM Approval
 * Tests that logistics documents are created automatically when RSM approves
 */

import { sequelize } from './db.js';
import * as models from './models/index.js';

async function testAutoSAPSync() {
  try {
    console.log('\n🧪 Testing Auto-SAP Sync on RSM Approval\n');
    console.log('═'.repeat(60));
    
    await sequelize.sync({ alter: false });

    // Get an approved request
    console.log('📋 Finding an approved spare request...\n');
    const approvedRequest = await models.SpareRequest.findOne({
      where: { status_id: 4 },
      include: [{
        model: models.SpareRequestItem,
        as: 'SpareRequestItems'
      }]
    });

    if (!approvedRequest) {
      console.log('❌ No approved request found');
      process.exit(0);
    }

    console.log(`✅ Found Request ID: ${approvedRequest.request_id}`);
    console.log(`   Status ID: ${approvedRequest.status_id} (4 = approved_by_rsm)`);
    console.log(`   Items: ${approvedRequest.SpareRequestItems.length}\n`);

    // Check if logistics documents exist for this request (should have been auto-created)
    console.log('📋 Checking Logistics Documents...\n');
    const logisticsDocs = await models.LogisticsDocuments.findAll({
      where: {
        reference_id: approvedRequest.request_id,
        reference_type: 'SPARE_REQUEST'
      }
    });

    console.log(`✅ Found ${logisticsDocs.length} Logistics Documents:\n`);
    logisticsDocs.forEach((doc, idx) => {
      console.log(`   ${idx + 1}. ${doc.document_type}: ${doc.document_number}`);
      console.log(`      From: ${doc.from_entity_type}/${doc.from_entity_id}`);
      console.log(`      To: ${doc.to_entity_type}/${doc.to_entity_id}`);
    });

    // Check for stock movements
    console.log('\n📋 Checking Stock Movements...\n');
    const stockMovements = await models.StockMovement.findAll({
      where: { reference_type: 'spare_request' },
      limit: 5
    });

    console.log(`✅ Found ${stockMovements.length} Stock Movements`);
    const dn_linked = stockMovements.find(m => 
      logisticsDocs.some(d => d.document_number && m.reference_no === d.document_number)
    );
    
    if (dn_linked) {
      console.log(`   ✅ Found DN-Linked Movement: ${dn_linked.reference_no}`);
      console.log(`      Type: ${dn_linked.stock_movement_type}`);
    }

    // Test Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 AUTO-SAP SYNC TEST SUMMARY\n');
    
    if (logisticsDocs.length > 0) {
      console.log('✨ SUCCESS: Logistics documents are auto-created on approval!');
      console.log(`   - Request ${approvedRequest.request_id} has ${logisticsDocs.length} SAP documents`);
      console.log(`   - SO (Purchase Order): ${logisticsDocs.filter(d => d.document_type === 'SO').length}`);
      console.log(`   - DN (Delivery Note): ${logisticsDocs.filter(d => d.document_type === 'DN').length}`);
      console.log(`   - CHALLAN (Dispatch): ${logisticsDocs.filter(d => d.document_type === 'CHALLAN').length}`);
    } else {
      console.log('⚠️  WARNING: No logistics documents created automatically');
      console.log('   This means auto-SAP sync may not be working');
      console.log('   User still needs to click "Track Order" to create them');
    }
    
    console.log('\n' + '═'.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testAutoSAPSync();
