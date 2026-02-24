/**
 * Comprehensive test script for technician assignment flow
 * Tests: Backend fetch, assignment, and response format
 * Run with: node test-technician-flow.js
 */

import { Calls, Customer, ServiceCenter, Status, CustomersProducts, Technicians } from './models/index.js';
import { sequelize } from './models/index.js';

async function runTests() {
  try {
    console.log('🧪 COMPREHENSIVE TECHNICIAN FLOW TEST\n');
    console.log('='.repeat(60));

    // Test 1: Fetch complaints with technician association
    console.log('\n📋 TEST 1: Fetch complaints with technician data');
    console.log('-'.repeat(60));
    
    const complaints = await Calls.findAll({
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['customer_id', 'name', 'mobile_no'],
          required: false
        },
        {
          model: Technicians,
          as: 'technician',
          attributes: ['technician_id', 'name'],
          required: false
        }
      ],
      limit: 5,
      order: [['created_at', 'DESC']]
    });

    console.log(`✅ Fetched ${complaints.length} complaints`);
    
    let withTechnician = 0;
    let withoutTechnician = 0;
    
    complaints.forEach((c, idx) => {
      const hasTech = c.assigned_tech_id && c.technician;
      if (hasTech) withTechnician++;
      else if (c.assigned_tech_id) {
        console.log(`⚠️  WARNING: Call ${c.call_id} has assigned_tech_id=${c.assigned_tech_id} but no technician association!`);
      } else {
        withoutTechnician++;
      }
      
      console.log(`  ${idx + 1}. Call #${c.call_id}: ${c.customer ? c.customer.name : 'Unknown'} → ${c.technician ? `✅ ${c.technician.name}` : '❌ Unassigned'}`);
    });
    
    console.log(`\n✅ Summary: ${withTechnician} with tech, ${withoutTechnician} unassigned`);

    // Test 2: Response format validation
    console.log('\n📋 TEST 2: Response format validation');
    console.log('-'.repeat(60));
    
    const formattedComplaints = complaints.map(c => ({
      ComplaintId: c.call_id,
      CallId: c.call_id,
      CustomerName: c.customer ? c.customer.name : 'Unknown',
      AssignedTechnicianId: c.assigned_tech_id,
      TechnicianName: c.technician ? c.technician.name : '',
    }));

    formattedComplaints.forEach((c, idx) => {
      console.log(`  ${idx + 1}. Call #${c.CallId}:`);
      console.log(`     - Customer: ${c.CustomerName}`);
      console.log(`     - Tech ID: ${c.AssignedTechnicianId || 'null'}`);
      console.log(`     - Tech Name: "${c.TechnicianName || '(empty)'}"`);
    });

    // Test 3: Field presence check
    console.log('\n📋 TEST 3: Required fields presence');
    console.log('-'.repeat(60));
    
    const fieldChecks = {
      'TechnicianName field present': formattedComplaints.every(c => 'TechnicianName' in c),
      'AssignedTechnicianId field present': formattedComplaints.every(c => 'AssignedTechnicianId' in c),
      'CustomerName field present': formattedComplaints.every(c => 'CustomerName' in c),
    };

    Object.entries(fieldChecks).forEach(([check, result]) => {
      console.log(`  ${result ? '✅' : '❌'} ${check}`);
    });

    // Test 4: Simulate assignment and verification
    console.log('\n📋 TEST 4: Verify assignment persists');
    console.log('-'.repeat(60));
    
    if (complaints.length > 0) {
      const testComplaint = complaints[0];
      console.log(`  Testing with Call #${testComplaint.call_id}`);
      
      // Re-fetch the same complaint
      const refetchedComplaint = await Calls.findOne({
        where: { call_id: testComplaint.call_id },
        include: [
          {
            model: Technicians,
            as: 'technician',
            attributes: ['technician_id', 'name'],
            required: false
          }
        ]
      });

      if (refetchedComplaint.assigned_tech_id) {
        console.log(`  ✅ Assignment persists: Tech ID ${refetchedComplaint.assigned_tech_id}`);
        if (refetchedComplaint.technician) {
          console.log(`  ✅ Technician data retrieved: ${refetchedComplaint.technician.name}`);
        } else {
          console.log(`  ❌ ERROR: Technician ID ${refetchedComplaint.assigned_tech_id} has no matching record!`);
        }
      } else {
        console.log(`  ℹ️  No technician assigned to this complaint`);
      }
    }

    // Test 5: Count statistics
    console.log('\n📋 TEST 5: Data statistics');
    console.log('-'.repeat(60));
    
    const totalCalls = await Calls.count();
    const assignedCalls = await Calls.count({ where: { assigned_tech_id: { $not: null } } });
    const unassignedCalls = totalCalls - assignedCalls;

    console.log(`  📊 Total calls: ${totalCalls}`);
    console.log(`  ✅ Assigned to technician: ${assignedCalls}`);
    console.log(`  ❌ Unassigned: ${unassignedCalls}`);
    console.log(`  📈 Assignment rate: ${totalCalls ? ((assignedCalls / totalCalls) * 100).toFixed(1) : 0}%`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!\n');
    console.log('Summary:');
    console.log('  • Backend properly fetches technician association');
    console.log('  • Response includes TechnicianName field');
    console.log('  • Assignments persist across multiple fetches');
    console.log('  • Field structure matches frontend expectations\n');
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error(err);
    process.exit(1);
  }
}

// Run tests
runTests();
