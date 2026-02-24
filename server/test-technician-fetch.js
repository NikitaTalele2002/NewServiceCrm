/**
 * Test script to verify technician name fetching from complaints
 * Run with: node test-technician-fetch.js
 */

import { Calls, Customer, ServiceCenter, Status, CustomersProducts, Technicians } from './models/index.js';

async function testFetchComplaints() {
  try {
    console.log('🔍 Testing complaint fetch with technician data...\n');

    // Test fetching complaints with technician association
    const complaints = await Calls.findAll({
      limit: 5,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['customer_id', 'name', 'mobile_no'],
          required: false
        },
        {
          model: ServiceCenter,
          as: 'serviceCenter',
          attributes: ['asc_id', 'asc_name'],
          required: false
        },
        {
          model: Status,
          as: 'status',
          attributes: ['status_id', 'status_name'],
          required: false
        },
        {
          model: Technicians,
          as: 'technician',
          attributes: ['technician_id', 'name'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    console.log(`✅ Fetched ${complaints.length} complaints\n`);

    complaints.forEach((c, idx) => {
      console.log(`📋 Complaint ${idx + 1}:`);
      console.log(`   Call ID: ${c.call_id}`);
      console.log(`   Customer: ${c.customer ? c.customer.name : 'Unknown'}`);
      console.log(`   Assigned Tech ID: ${c.assigned_tech_id}`);
      console.log(`   Technician Name: ${c.technician ? c.technician.name : '(none assigned)'}`);
      console.log(`   Status: ${c.status ? c.status.status_name : 'Unknown'}\n`);
    });

    // Test with WHERE clause for assigned technician
    console.log('🔍 Testing complaints with assigned technician...\n');
    const assignedComplaints = await Calls.findAll({
      where: { assigned_tech_id: { $not: null } },
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

    console.log(`✅ Found ${assignedComplaints.length} complaints with assigned technicians\n`);

    assignedComplaints.forEach((c, idx) => {
      console.log(`📋 Complaint ${idx + 1}:`);
      console.log(`   Call ID: ${c.call_id}`);
      console.log(`   Customer: ${c.customer ? c.customer.name : 'Unknown'}`);
      console.log(`   Assigned Tech ID: ${c.assigned_tech_id}`);
      console.log(`   Technician: ${c.technician ? c.technician.name : '❌ NOT FOUND'}`);
      if (!c.technician && c.assigned_tech_id) {
        console.log(`   ⚠️  WARNING: Tech ID ${c.assigned_tech_id} has no matching technician!`);
      }
      console.log();
    });

    console.log('✅ Test completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

testFetchComplaints();
