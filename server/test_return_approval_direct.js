import { sequelize } from './db.js';
import * as spareReturnRequestService from './services/spareReturnRequestService.js';

async function testReturnRequestApprovals() {
  try {
    console.log('🧪 Testing Return Request Approval Insertion - Direct Service Test\n');
    console.log('═'.repeat(70));

    // Get initial count
    const initialCount = await sequelize.query(`
      SELECT COUNT(*) as total FROM approvals WHERE entity_type = 'return_request'
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`\n📊 Initial return_request approvals: ${initialCount[0].total}`);

    // Find a return request to test
    console.log(`\n🔍 Finding a return request to test...\n`);
    const returnRequest = await sequelize.query(`
      SELECT TOP 1
        sr.request_id,
        sr.requested_source_id,
        sr.status_id,
        s.status_name
      FROM spare_requests sr
      LEFT JOIN [status] s ON sr.status_id = s.status_id
      WHERE sr.request_reason_type = 'return'
        AND sr.status_id NOT IN (SELECT status_id FROM [status] WHERE status_name IN ('approved', 'rejected'))
      ORDER BY sr.request_id DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (returnRequest.length === 0) {
      console.log('   ⚠️  No pending return requests found for testing');
      await sequelize.close();
      return;
    }

    const testReturnId = returnRequest[0].request_id;
    console.log(`   ✅ Found return request ${testReturnId} (Status: ${returnRequest[0].status_name})`);

    // Get return items
    const returnItems = await sequelize.query(`
      SELECT id, spare_id, requested_qty
      FROM spare_request_items
      WHERE request_id = ?
    `, { replacements: [testReturnId], type: sequelize.QueryTypes.SELECT });

    console.log(`   ✅ Found ${returnItems.length} items`);

    // Test 1: Verify/Approve the return request
    console.log(`\n1️⃣ Testing Return Request Approval...\n`);
    
    const verifyData = {
      verified_items: returnItems.map(item => ({
        return_item_id: item.id,
        verified_good_qty: Math.floor((item.requested_qty || 0) * 0.7),
        verified_defective_qty: Math.ceil((item.requested_qty || 0) * 0.3),
        condition_notes: 'Tested and verified'
      })),
      verified_remarks: 'Approved in test',
      verified_by_user_id: 1
    };

    const transaction = await sequelize.transaction();
    try {
      const result = await spareReturnRequestService.verifyReturnRequest(
        testReturnId,
        4, // service center id
        verifyData,
        transaction
      );

      await transaction.commit();

      if (result) {
        console.log(`   ✅ Return request ${testReturnId} approved`);
        console.log(`      Stock Movement ID: ${result.stock_movement_id}`);
        console.log(`      Total Qty Returned: ${result.total_qty_returned}`);
      }
    } catch (error) {
      await transaction.rollback();
      console.log(`   ❌ Error approving return request: ${error.message}`);
    }

    // Check if approval record was created
    console.log(`\n2️⃣ Checking if approval record was created...\n`);

    const approvalRecord = await sequelize.query(`
      SELECT TOP 1
        approval_id,
        entity_type,
        entity_id,
        approval_status,
        approval_remarks,
        created_at
      FROM approvals
      WHERE entity_type = 'return_request'
        AND entity_id = ?
      ORDER BY created_at DESC
    `, { replacements: [testReturnId], type: sequelize.QueryTypes.SELECT });

    if (approvalRecord.length > 0) {
      const record = approvalRecord[0];
      console.log(`   ✅ APPROVAL RECORD FOUND!\n`);
      console.log(`      ID: ${record.approval_id}`);
      console.log(`      Entity: ${record.entity_type} (ID: ${record.entity_id})`);
      console.log(`      Status: ${record.approval_status}`);
      console.log(`      Remarks: ${record.approval_remarks}`);
      console.log(`      Created: ${record.created_at}`);
    } else {
      console.log(`   ❌ NO APPROVAL RECORD FOUND!`);
    }

    // Get final count
    const finalCount = await sequelize.query(`
      SELECT COUNT(*) as total FROM approvals WHERE entity_type = 'return_request'
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`\n📊 Final return_request approvals: ${finalCount[0].total}`);
    console.log(`   ✅ New approvals created: ${finalCount[0].total - initialCount[0].total}`);

    if (finalCount[0].total > initialCount[0].total) {
      console.log(`\n✅ SUCCESS: Return request approvals are being inserted correctly!`);
    } else {
      console.log(`\n❌ FAILURE: Return request approval records are NOT being created`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testReturnRequestApprovals();
