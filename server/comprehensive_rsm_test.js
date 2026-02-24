#!/usr/bin/env node
/**
 * Comprehensive verification script for RSM inventory allocation
 * Tests the complete flow: requests -> inventory lookup -> availability
 */

import { sequelize, SpareRequest, SpareRequestItem, Status, Approvals, SpareInventory } from './models/index.js';

async function comprehensiveTest() {
  try {
    const rsmUserId = 1;  
    
    console.log('\n✅ COMPREHENSIVE RSM INVENTORY TEST\n');
    
    // 1) Verify RSM setup
    console.log('=== 1. RSM STATE MAPPING ===');
    const stateRows = await sequelize.query(
      `SELECT DISTINCT sm.state_id FROM rsm_state_mapping sm WHERE sm.rsm_user_id = ? AND sm.is_active = 1`,
      { replacements: [rsmUserId], type: sequelize.QueryTypes.SELECT }
    );
    console.log('RSM states:', stateRows.map(r => r.state_id).join(', '));
    
    if (stateRows.length === 0) {
      console.log('⚠️  No states assigned to RSM user!');
      process.exit(1);
    }
    
    const stateIds = stateRows.map(r => r.state_id).filter(Boolean);
    
    // 2) Verify plants in those states
    console.log('\n=== 2. PLANTS IN RSM STATES ===');
    const plantRows = await sequelize.query(
      `SELECT p.plant_id, p.plant_code, p.state_id FROM plants p WHERE p.state_id IN (${stateIds.map(() => '?').join(',')})`,
      { replacements: stateIds, type: sequelize.QueryTypes.SELECT }
    );
    console.log(`Found ${plantRows.length} plants:`,  plantRows.map(p => `${p.plant_code} (ID:${p.plant_id})`).join(', '));
    
    const plantIds = plantRows.map(r => r.plant_id).filter(Boolean);
    
    // 3) Check pending status
    console.log('\n=== 3. PENDING STATUS CHECK ===');
    const pendingStatus = await Status.findOne({ where: { status_name: 'pending' } });
    console.log('Pending status ID:', pendingStatus?.status_id, 'Name:', pendingStatus?.status_name);
    
    // 4) Find spare requests directed TO plants (where inventory is)
    console.log('\n=== 4. SPARE REQUESTS READY FOR RSM ===');
    console.log('Criteria: requested_to_type IN ("plant"), requested_to_id IN (', plantIds.join(','), '), status = "pending"');
    
    const requests = await sequelize.query(
      `SELECT sr.request_id, sr.requested_to_type, sr.requested_to_id, sr.requested_source_type, sr.requested_source_id, 
              COUNT(sii.id) as item_count, sr.created_at
       FROM spare_requests sr
       LEFT JOIN spare_request_items sii ON sr.request_id = sii.request_id
       WHERE sr.requested_to_type = 'plant' AND sr.requested_to_id IN (${plantIds.map(() => '?').join(',')}) 
             AND sr.status_id = ?
       GROUP BY sr.request_id, sr.requested_to_type, sr.requested_to_id, sr.requested_source_type, sr.requested_source_id, sr.created_at
       ORDER BY sr.created_at DESC`,
      { replacements: [...plantIds, pendingStatus?.status_id || 1], type: sequelize.QueryTypes.SELECT }
    );
    
    console.log(`\nFound ${requests.length} pending requests:`);
    
    if (requests.length === 0) {
      console.log('⚠️  No pending requests found! Nothing for RSM to approve.');
      process.exit(0);
    }
    
    // 5) For each request, check available inventory
    console.log('\n=== 5. INVENTORY AVAILABILITY FOR EACH REQUEST ===\n');
    
    for (const req of requests.slice(0, 5)) {
      console.log(`\nRequest ID ${req.request_id}:`);
      console.log(`  From: ${req.requested_source_type} ${req.requested_source_id}`);
      console.log(`  To (PLANT): ${req.requested_to_type} ${req.requested_to_id}`);
      console.log(`  Items: ${req.item_count}`);
      
      // Get items in this request
      const items = await sequelize.query(
        `SELECT id, spare_id, requested_qty FROM spare_request_items WHERE request_id = ?`,
        { replacements: [req.request_id], type: sequelize.QueryTypes.SELECT }
      );
      
      let totalAvailable = 0;
      for (const item of items) {
        const inv = await SpareInventory.findOne({
          where: {
            spare_id: item.spare_id,
            location_type: req.requested_to_type,
            location_id: req.requested_to_id
          }
        });
        
        const available = inv ? (inv.qty_good || 0) : 0;
        totalAvailable += available;
        
        console.log(`    Spare ${item.spare_id}: Req=${item.requested_qty}, Available at ${req.requested_to_type} ${req.requested_to_id}=${available}`);
      }
      
      console.log(`  ➜ Total available to allocate: ${totalAvailable}`);
    }
    
    console.log('\n✅ TEST COMPLETE\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

comprehensiveTest();
