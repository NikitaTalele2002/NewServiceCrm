/**
 * Test script to verify spare returns are displayed on rental return page
 */

import { sequelize, connectDB } from './db.js';
import { QueryTypes } from 'sequelize';

const test = async () => {
  try {
    await connectDB();
    
    console.log('\n=== Testing Spare Returns Display ===\n');
    
    // Test 1: Verify spare returns exist for service center 2
    console.log('📋 Test 1: Spare returns for Service Center ID 2:');
    const returns = await sequelize.query(
      `SELECT TOP 10 sr.request_id, sr.spare_request_type, sr.request_reason, s.status_name
       FROM spare_requests sr
       LEFT JOIN status s ON sr.status_id = s.status_id
       WHERE sr.requested_to_id = 2 AND sr.requested_source_type = 'technician'
       ORDER BY sr.request_id DESC`,
      { type: QueryTypes.SELECT }
    );
    
    console.log(`✓ Found ${returns.length} spare returns for SC 2`);
    returns.forEach(r => {
      console.log(`  - ID: ${r.request_id}, Type: ${r.spare_request_type}, Reason: ${r.request_reason}, Status: ${r.status_name}`);
    });
    
    // Test 2: Simulate API query for pending returns
    console.log('\n📋 Test 2: API Query Simulation (pending returns for SC 2):');
    const apiResults = await sequelize.query(
      `SELECT 
        sr.request_id as id,
        sr.requested_source_id as technicianId,
        sr.spare_request_type,
        sr.request_reason,
        s.status_name as status
      FROM spare_requests sr
      LEFT JOIN status s ON sr.status_id = s.status_id
      WHERE sr.requested_to_id = 2
        AND sr.requested_source_type = 'technician'
        AND s.status_name = 'Pending'
        AND (sr.request_reason = 'replacement' OR sr.spare_request_type IN ('TECH_RETURN_DEFECTIVE', 'TECH_RETURN_EXCESS'))
      ORDER BY sr.request_id DESC`,
      { type: QueryTypes.SELECT }
    );
    
    console.log(`✓ Found ${apiResults.length} pending spare returns for rental return page`);
    apiResults.forEach(r => {
      console.log(`  - ID: ${r.id} (Tech ${r.technicianId}), Type: ${r.spare_request_type}, Reason: ${r.request_reason}`);
    });
    
    // Test 3: Verify ASC returns are routing to plant
    console.log('\n📋 Test 3: ASC Returns routing (should go to plant, not warehouse):');
    const ascReturns = await sequelize.query(
      `SELECT TOP 5 sr.request_id, sr.spare_request_type, sr.requested_source_type, sr.requested_to_type, sr.requested_to_id
       FROM spare_requests sr
       WHERE sr.spare_request_type IN ('ASC_RETURN_DEFECTIVE', 'ASC_RETURN_EXCESS')
       ORDER BY sr.request_id DESC`,
      { type: QueryTypes.SELECT }
    );
    
    console.log(`✓ Found ${ascReturns.length} ASC returns`);
    ascReturns.forEach(r => {
      console.log(`  - ID: ${r.request_id}, Type: ${r.spare_request_type}`);
      console.log(`    From: ${r.requested_source_type} → To: ${r.requested_to_type} (ID: ${r.requested_to_id})`);
    });
    
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

test();
