#!/usr/bin/env node
/**
 * Debug script to test RSM spare requests API
 * Shows what availableQty is being returned
 */

import { sequelize, SpareRequest, SpareRequestItem, Status, Approvals, SpareInventory } from './models/index.js';

async function testRsmAPI() {
  try {
    const rsmUserId = 1;  // Adjust as needed
    
    // 1) Find state_ids assigned to this RSM
    const stateRows = await sequelize.query(
      `SELECT DISTINCT sm.state_id AS state_id FROM rsm_state_mapping sm WHERE sm.rsm_user_id = ? AND sm.is_active = 1`,
      { replacements: [rsmUserId], type: sequelize.QueryTypes.SELECT }
    );
    const stateIds = stateRows.map(r => r.state_id).filter(Boolean);
    console.log('[1] State IDs for RSM:', stateIds);
    if (stateIds.length === 0) {
      console.log('No states assigned to RSM');
      process.exit(0);
    }

    // 2) Find plant_ids in those states
    const plantRows = await sequelize.query(
      `SELECT DISTINCT p.plant_id AS plant_id FROM plants p WHERE p.state_id IN (${stateIds.map(() => '?').join(',')})`,
      { replacements: stateIds, type: sequelize.QueryTypes.SELECT }
    );
    const plantIds = plantRows.map(r => r.plant_id).filter(Boolean);
    console.log('[2] Plant IDs:', plantIds);
    
    if (plantIds.length === 0) {
      console.log('No plants found for RSM states');
      process.exit(0);
    }

    // 3) Get pending status_id
    const pendingStatus = await Status.findOne({ where: { status_name: 'pending' } });
    const pendingStatusId = pendingStatus?.status_id || 1;
    console.log('[3] Pending Status ID:', pendingStatusId);

    // 4) Fetch PENDING requests where requested_to_type = 'plant' and requested_to_id in plantIds
    const allRequests = await SpareRequest.findAll({
      where: {
        requested_to_type: 'plant',
        requested_to_id: plantIds,
        status_id: pendingStatusId
      },
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
          required: false,
        }
      ],
      limit: 10,
    });
    
    console.log('[4] Found', allRequests.length, 'pending requests');
    
    // 5) Process each request and check available inventory FROM SOURCE (what RSM allocates)
    for (const request of allRequests) {
      console.log('\n=== Request ID:', request.request_id, '===');
      console.log('  Requested FROM:', request.requested_source_type, request.requested_source_id, '(SOURCE)');
      console.log('  Requested TO:', request.requested_to_type, request.requested_to_id, '(DESTINATION)');
      
      for (const item of request.SpareRequestItems || []) {
        console.log(`  Item: spare_id=${item.spare_id}, requested_qty=${item.requested_qty}`);
        
        // Query inventory FROM SOURCE (where RSM allocates from)
        const sourceInventory = await SpareInventory.findOne({
          where: {
            spare_id: item.spare_id,
            location_type: request.requested_source_type,
            location_id: request.requested_source_id
          }
        });
        
        const availableQty = sourceInventory ? (sourceInventory.qty_good || 0) : 0;
        console.log(`    -> Available at SOURCE for allocation: ${availableQty} (at ${request.requested_source_type} ${request.requested_source_id})`);
        
        if (!sourceInventory) {
          // Debug: check if any inventory exists for this spare
          const allForSpare = await SpareInventory.findAll({
            where: { spare_id: item.spare_id }
          });
          console.log(`    Inventory records for spare_id ${item.spare_id}:`, 
            allForSpare.map(inv => `${inv.location_type}/${inv.location_id}=${inv.qty_good}`).join(', ')
          );
        }
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testRsmAPI();
