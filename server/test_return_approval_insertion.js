import { sequelize } from './db.js';

const API_BASE = 'http://localhost:5000';

// Test token for a service center user
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6IlNDIFVzZXIiLCJ1c2VybmFtZSI6IlNDVXNlciIsImNlbnRlcklkIjo0LCJyb2xlIjoic2VydmljZV9jZW50ZXIiLCJpYXQiOjE3MDAwMDAwMDB9.test-token';

async function testReturnApprovalInsertion() {
  try {
    console.log('🧪 Testing Spare Return Request Approval Insertion\n');
    console.log('═'.repeat(70));

    // Get initial approval count
    console.log('\n1️⃣ Checking initial approval count...\n');
    const initialCount = await sequelize.query(`
      SELECT COUNT(*) as total FROM approvals WHERE entity_type = 'return_request'
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`   Current return_request approvals: ${initialCount[0].total}`);

    // Find a return request to approve
    console.log('\n2️⃣ Finding a return request to approve...\n');
    const returnRequests = await sequelize.query(`
      SELECT TOP 1
        sr.request_id,
        sr.requested_source_id,
        sr.status_id,
        s.status_name
      FROM spare_requests sr
      LEFT JOIN [status] s ON sr.status_id = s.status_id
      WHERE sr.request_reason_type = 'return'
        AND sr.requested_to_id = 4
        AND sr.status_id NOT IN (SELECT status_id FROM [status] WHERE status_name IN ('approved', 'rejected', 'verified', 'completed'))
      ORDER BY sr.request_id DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (returnRequests.length === 0) {
      console.log('   ⚠️  No pending return requests found to test');
      console.log('   Creating a test return request...\n');
      
      // Create a test return request
      const createResponse = await fetch(
        `${API_BASE}/api/spare-return-requests/create`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            technician_id: 1,
            call_id: 1,
            items: [
              { spare_id: 3, returned_qty: 2, defective_qty: 0 }
            ]
          })
        }
      );
      const createResult = await createResponse.json();

      if (createResult.data.returnRequestId) {
        const newReturnRequest = await sequelize.query(`
          SELECT TOP 1
            sr.request_id,
            sr.requested_source_id,
            sr.status_id,
            s.status_name
          FROM spare_requests sr
          LEFT JOIN [status] s ON sr.status_id = s.status_id
          WHERE sr.request_id = ?
        `, { replacements: [createResult.data.returnRequestId], type: sequelize.QueryTypes.SELECT });
        
        if (newReturnRequest.length > 0) {
          returnRequests.push(newReturnRequest[0]);
        }
      }
    }

    if (returnRequests.length === 0) {
      console.log('   ❌ Could not find or create a return request');
      await sequelize.close();
      return;
    }

    const returnRequest = returnRequests[0];
    console.log(`   ✅ Found return request ${returnRequest.request_id}`);
    console.log(`      Status: ${returnRequest.status_name}`);
    console.log(`      Requested by: Technician ${returnRequest.requested_source_id}`);

    // Get return items
    console.log('\n3️⃣ Getting return items...\n');
    const returnItems = await sequelize.query(`
      SELECT id, spare_id, requested_qty, ApprovedQty
      FROM spare_request_items
      WHERE request_id = ?
    `, { replacements: [returnRequest.request_id], type: sequelize.QueryTypes.SELECT });

    console.log(`   ✅ Found ${returnItems.length} items to approve`);

    if (returnItems.length === 0) {
      console.log('   ⚠️  No items found in return request');
      await sequelize.close();
      return;
    }

    // Prepare approval data
    const approvedItems = returnItems.map(item => ({
      return_item_id: item.id,
      approved_good_qty: Math.floor((item.requested_qty || 0) * 0.8),
      approved_defective_qty: Math.ceil((item.requested_qty || 0) * 0.2),
      condition_notes: 'Verified in test'
    }));

    console.log(`   Items prepared for approval: ${approvedItems.length}`);

    // Approve the return request
    console.log('\n4️⃣ Approving return request...\n');
    console.log(`   Sending POST /api/spare-return-requests/${returnRequest.request_id}/approve`);

    try {
      const response = await fetch(
        `${API_BASE}/api/spare-return-requests/${returnRequest.request_id}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${testToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ approved_items: approvedItems })
        }
      );
      const data = await response.json();

      if (data.success) {
        console.log(`   ✅ Return request approved successfully`);
        console.log(`   Message: ${data.message}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Error from API: ${error.message}`);
      console.log(`   Details: ${error.response?.data?.details || 'N/A'}`);
    }

    // Check if approval record was created
    console.log('\n5️⃣ Checking if approval record was created...\n');

    const newApprovals = await sequelize.query(`
      SELECT TOP 5
        approval_id,
        entity_type,
        entity_id,
        approval_status,
        approval_remarks,
        created_at
      FROM approvals
      WHERE entity_type = 'return_request'
        AND entity_id = ?
        AND approval_status = 'approved'
      ORDER BY created_at DESC
    `, { replacements: [returnRequest.request_id], type: sequelize.QueryTypes.SELECT });

    if (newApprovals.length > 0) {
      console.log(`   ✅ APPROVAL RECORD CREATED!\n`);
      newApprovals.forEach(approval => {
        console.log(`   Approval #${approval.approval_id}:`);
        console.log(`     Entity: ${approval.entity_type} (ID: ${approval.entity_id})`);
        console.log(`     Status: ${approval.approval_status}`);
        console.log(`     Remarks: ${approval.approval_remarks}`);
        console.log(`     Created: ${approval.created_at}\n`);
      });
    } else {
      console.log(`   ❌ NO APPROVAL RECORD FOUND!`);
      console.log(`   This indicates the approval was not inserted into the database`);
    }

    // Check total count
    console.log('\n6️⃣ Checking final approval count...\n');
    const finalCount = await sequelize.query(`
      SELECT COUNT(*) as total FROM approvals WHERE entity_type = 'return_request'
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`   Initial count: ${initialCount[0].total}`);
    console.log(`   Final count: ${finalCount[0].total}`);
    console.log(`   New records added: ${finalCount[0].total - initialCount[0].total}`);

    if (finalCount[0].total > initialCount[0].total) {
      console.log(`\n✅ SUCCESS: Return request approvals are being created correctly!`);
    } else {
      console.log(`\n❌ FAILURE: No new return request approval records were created`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testReturnApprovalInsertion();
