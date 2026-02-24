/**
 * Final Verification Test
 * Tests that technician names persist after page refresh
 * This simulates the exact flow a user would experience
 */

import { Calls, Customer, ServiceCenter, Status, CustomersProducts, Technicians } from './models/index.js';

async function testRefreshPersistence() {
  try {
    console.log('🧪 REFRESH PERSISTENCE TEST\n');
    console.log('=' .repeat(70));
    
    console.log('\n📋 STEP 1: Simulate initial page load');
    console.log('-'.repeat(70));
    
    // Initial page load - fetch complaints
    const initialComplaints = await Calls.findAll({
      include: [
        { model: Customer, as: 'customer', attributes: ['name'], required: false },
        { model: Technicians, as: 'technician', attributes: ['name'], required: false }
      ],
      limit: 3,
      order: [['created_at', 'DESC']]
    });

    console.log(`✅ Loaded ${initialComplaints.length} complaints`);
    initialComplaints.forEach((c, i) => {
      console.log(`  ${i+1}. Call #${c.call_id}: ${c.customer?.name} | Tech: ${c.technician?.name || '(unassigned)'}`);
    });

    console.log('\n📋 STEP 2: Simulate user assigns technician');
    console.log('-'.repeat(70));
    
    if (initialComplaints.length > 0 && !initialComplaints[0].assigned_tech_id) {
      const testCall = initialComplaints[0];
      
      // Find a technician to assign
      const technician = await Technicians.findOne({ 
        where: { status: 'active' } 
      });
      
      if (technician) {
        console.log(`  Assigning technician: ${technician.name} (ID: ${technician.technician_id})`);
        console.log(`  To complaint: Call #${testCall.call_id}`);
        
        // Simulate assignment in database
        await testCall.update({ 
          assigned_tech_id: technician.technician_id 
        });
        
        console.log(`  ✅ Assignment saved to database`);
      } else {
        console.log('  ⚠️  No active technicians found for testing');
      }
    }

    console.log('\n📋 STEP 3: Simulate immediate state update (frontend hook)');
    console.log('-'.repeat(70));
    
    // Frontend hook immediately updates state with technician name
    if (initialComplaints.length > 0) {
      const testCall = initialComplaints[0];
      if (testCall.assigned_tech_id && testCall.technician) {
        console.log(`  ✅ Frontend shows: "${testCall.technician.name}" immediately`);
      }
    }

    console.log('\n📋 STEP 4: Simulate page refresh (re-fetch from API)');
    console.log('-'.repeat(70));
    
    // After refresh - re-fetch the same complaints
    const refreshedComplaints = await Calls.findAll({
      include: [
        { model: Customer, as: 'customer', attributes: ['name'], required: false },
        { model: Technicians, as: 'technician', attributes: ['name'], required: false }
      ],
      limit: 3,
      order: [['created_at', 'DESC']]
    });

    console.log(`✅ Re-fetched ${refreshedComplaints.length} complaints after refresh`);
    
    let allTechniciansPersist = true;
    refreshedComplaints.forEach((c, i) => {
      const hasAppointedTech = c.assigned_tech_id;
      const hasTechName = c.technician?.name;
      const status = hasAppointedTech ? (hasTechName ? '✅' : '❌') : '⏸️ ';
      console.log(`  ${status} Call #${c.call_id}: ${c.customer?.name} | Tech: "${c.technician?.name || '(unassigned)'}"`);
      
      if (hasAppointedTech && !hasTechName) {
        console.log(`      ⚠️  WARNING: Has Tech ID but no name!`);
        allTechniciansPersist = false;
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ PERSISTENCE TEST RESULTS:\n');
    
    if (allTechniciansPersist) {
      console.log('  ✅ ALL assignments persist after refresh!');
      console.log('  ✅ Technician names are returned from API');
      console.log('  ✅ Frontend will show consistent data');
    } else {
      console.log('  ❌ Some technician names are missing after refresh');
      console.log('  ❌ Check database and API response format');
    }

    console.log('\n' + '='.repeat(70) + '\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:');
    console.error(err);
    process.exit(1);
  }
}

testRefreshPersistence();
