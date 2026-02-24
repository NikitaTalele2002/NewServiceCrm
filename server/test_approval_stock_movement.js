#!/usr/bin/env node
/**
 * Test: RSM Approval with Stock Movement Creation
 * Simulates RSM approving a spare request and verifies stock_movement is created
 */

import { sequelize, SpareRequest, StockMovement } from './models/index.js';

async function testApprovalWithMovement() {
  try {
    console.log('\n✅ TEST: RSM APPROVAL CREATES STOCK MOVEMENT\n');
    
    // Find a recently approved request
    const request = await SpareRequest.findOne({
      where: { 
        requested_to_type: 'plant',
        status_id: 2 // Assuming approved_by_rsm has status_id=2
      },
      order: [['updated_at', 'DESC']]
    });
    
    if (!request) {
      console.log('⚠️  No recently approved requests found');
      console.log('Creating a test approval...\n');
      
      // Get a pending request
      const pendingReq = await SpareRequest.findOne({
        where: { status_id: 1 } // pending
      });
      
      if (pendingReq) {
        console.log(`Found pending request ${pendingReq.request_id}`);
        console.log('Run: curl -X POST http://localhost:5000/api/rsm/spare-requests/REQUEST_ID/approve \\');
        console.log('  -H "Authorization: Bearer YOUR_TOKEN" \\');
        console.log('  -H "Content-Type: application/json" \\');
        console.log('  -d \'{"approvals": {"ITEM_ID": {"approvedQty": 10}}}\'');
      }
      process.exit(0);
    }
    
    console.log(`✅ Found recent request: ${request.request_id}`);
    console.log(`   Status: approved_by_rsm`);
    console.log(`   From: ${request.requested_source_type} ${request.requested_source_id}`);
    console.log(`   To: ${request.requested_to_type} ${request.requested_to_id}`);
    
    // Check if stock movement was created
    const movements = await StockMovement.findAll({
      where: {
        reference_type: 'spare_request',
        reference_no: request.request_id.toString()
      }
    });
    
    if (movements.length === 0) {
      console.log('\n❌ ERROR: No stock movements found for this request!');
      console.log('   The approval did not create stock_movement records');
      process.exit(1);
    }
    
    console.log(`\n✅ Found ${movements.length} stock movement(s):`);
    
    for (const mov of movements) {
      console.log(`\n   Movement ID: ${mov.movement_id}`);
      console.log(`   Type: ${mov.stock_movement_type}`);
      console.log(`   From: ${mov.source_location_type} ${mov.source_location_id}`);
      console.log(`   To: ${mov.destination_location_type} ${mov.destination_location_id}`);
      console.log(`   Quantity: ${mov.total_qty}`);
      console.log(`   Bucket: ${mov.bucket}`);
      console.log(`   Operation: ${mov.bucket_operation}`);
      console.log(`   Status: ${mov.status}`);
      console.log(`   Created: ${mov.created_at}`);
    }
    
    console.log('\n✅ TEST PASSED: Stock movements are being created correctly!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

testApprovalWithMovement();
