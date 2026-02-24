import { sequelize } from './db.js';

const API_BASE = 'http://localhost:5000';

// Test token - needs to be from a valid ASC user
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6IlNDIFVzZXIiLCJ1c2VybmFtZSI6IlNDVXNlciIsImNlbnRlcklkIjo0LCJyb2xlIjoic2VydmljZV9jZW50ZXIiLCJpYXQiOjE3MDAwMDAwMDB9.test-token';

async function testApprovalRecordCreation() {
  try {
    console.log('🧪 Testing Approval Record Creation\n');
    console.log('═'.repeat(70));

    // Step 1: Test technician spare request approval
    console.log('\n1️⃣ Testing Technician Spare Request Approval\n');

    // Find an approved request for ASC
    console.log('   Finding a technician spare request...');
    const requests = await sequelize.query(`
      SELECT TOP 1 
        sr.request_id,
        sr.requested_to_id,
        sr.status_id,
        s.status_name
      FROM spare_requests sr
      LEFT JOIN [status] s ON sr.status_id = s.status_id
      WHERE sr.requested_source_type = 'technician'
        AND sr.requested_to_id = 4
        AND sr.status_id IN (SELECT status_id FROM [status] WHERE status_name NOT IN ('approved', 'rejected'))
      ORDER BY sr.request_id DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (requests.length === 0) {
      console.log('   ⚠️  No technician spare requests found to test');
    } else {
      const request = requests[0];
      console.log(`   ✅ Found request ${request.request_id} (Status: ${request.status_name})`);

      // Get items
      const items = await sequelize.query(`
        SELECT id, spare_id, requested_qty, approved_qty
        FROM spare_request_items
        WHERE request_id = ?
      `, { replacements: [request.request_id], type: sequelize.QueryTypes.SELECT });

      console.log(`   ✅ Found ${items.length} items`);

      // Prepare approval data
      const approvedItems = items.map(item => ({
        spare_request_item_id: item.id,
        approvedQty: Math.min(item.requested_qty, 5)
      }));

      console.log(`\n   Approving request ${request.request_id}...`);

      try {
        const response = await fetch(
          `${API_BASE}/api/technician-spare-requests/${request.request_id}/approve`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${testToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ approvedItems })
          }
        );
        const data = await response.json();

        if (data.success) {
          console.log(`   ✅ Request approved successfully`);

          // Check if approval record was created
          const approval = await sequelize.query(`
            SELECT TOP 1 a.*
            FROM approvals a
            WHERE a.entity_type = 'spare_request'
              AND a.entity_id = ?
              AND a.approval_status = 'approved'
            ORDER BY a.created_at DESC
          `, { replacements: [request.request_id], type: sequelize.QueryTypes.SELECT });

          if (approval.length > 0) {
            console.log(`   ✅ APPROVAL RECORD CREATED!`);
            console.log(`      ID: ${approval[0].approval_id}`);
            console.log(`      Remarks: ${approval[0].approval_remarks}`);
            console.log(`      Created: ${approval[0].created_at}`);
          } else {
            console.log(`   ❌ NO APPROVAL RECORD FOUND!`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Error approving: ${error.response?.data?.error || error.message}`);
      }
    }

    // Step 2: Test spare return request approval
    console.log('\n\n2️⃣ Testing Spare Return Request Approval\n');

    // Find a pending return request
    console.log('   Finding a spare return request...');
    const returnRequests = await sequelize.query(`
      SELECT TOP 1
        sr.request_id,
        sr.requested_source_id,
        sr.status_id,
        s.status_name
      FROM spare_requests sr
      LEFT JOIN [status] s ON sr.status_id = s.status_id
      WHERE sr.request_reason_type = 'return'
        AND sr.status_id IN (SELECT status_id FROM [status] WHERE status_name NOT IN ('approved', 'rejected'))
      ORDER BY sr.request_id DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (returnRequests.length === 0) {
      console.log('   ⚠️  No spare return requests found to test');
    } else {
      const returnRequest = returnRequests[0];
      console.log(`   ✅ Found return request ${returnRequest.request_id} (Status: ${returnRequest.status_name})`);

      // Get return items
      const returnItems = await sequelize.query(`
        SELECT id, spare_id, requested_qty, approved_qty
        FROM spare_request_items
        WHERE request_id = ?
      `, { replacements: [returnRequest.request_id], type: sequelize.QueryTypes.SELECT });

      console.log(`   ✅ Found ${returnItems.length} return items`);

      // Prepare approval data
      const approvedReturnItems = returnItems.map(item => ({
        return_item_id: item.id,
        approved_good_qty: Math.floor((item.requested_qty || 0) * 0.8),
        approved_defective_qty: Math.ceil((item.requested_qty || 0) * 0.2),
        condition_notes: 'Verified and approved'
      }));

      console.log(`\n   Approving return request ${returnRequest.request_id}...`);

      try {
        const response = await fetch(
          `${API_BASE}/api/spare-return-requests/${returnRequest.request_id}/approve`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${testToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ approved_items: approvedReturnItems })
          }
        );
        const data = await response.json();

        if (data.success) {
          console.log(`   ✅ Return request approved successfully`);

          // Check if approval record was created
          const approval = await sequelize.query(`
            SELECT TOP 1 a.*
            FROM approvals a
            WHERE a.entity_type = 'return_request'
              AND a.entity_id = ?
              AND a.approval_status = 'approved'
            ORDER BY a.created_at DESC
          `, { replacements: [returnRequest.request_id], type: sequelize.QueryTypes.SELECT });

          if (approval.length > 0) {
            console.log(`   ✅ APPROVAL RECORD CREATED!`);
            console.log(`      ID: ${approval[0].approval_id}`);
            console.log(`      Remarks: ${approval[0].approval_remarks}`);
            console.log(`      Created: ${approval[0].created_at}`);
          } else {
            console.log(`   ❌ NO APPROVAL RECORD FOUND!`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Error approving: ${error.response?.data?.error || error.message}`);
      }
    }

    console.log('\n✅ Test complete');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testApprovalRecordCreation();
