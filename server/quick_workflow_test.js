// Quick test to verify workflow steps
import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

console.log('🧪 QUICK WORKFLOW TEST');
console.log('='.repeat(70));

try {
  // Step 1: Create call
  console.log('\n✓ Step 1: Creating call...');
  const [callResult] = await sequelize.query(`
    INSERT INTO calls (
      customer_id, call_type, call_source, caller_type,
      assigned_asc_id, assigned_tech_id, status_id, created_at, updated_at
    ) VALUES (1, 'complaint', 'phone', 'customer', 1, 1, 1, GETDATE(), GETDATE())
    
    SELECT TOP 1 call_id FROM calls ORDER BY call_id DESC
  `, { type: QueryTypes.SELECT });

  const callId = callResult?.call_id;
  console.log(`✅ Call created: ID ${callId}`);

  // Step 2: Create spare request
  console.log('\n✓ Step 2: Creating spare request...');
  const [reqResult] = await sequelize.query(`
    INSERT INTO spare_requests (
      call_id, requested_source_type, requested_source_id,
      requested_to_type, requested_to_id, request_reason,
      spare_request_type, status_id, created_by, created_at, updated_at
    ) VALUES (?, 'technician', 1, 'service_center', 1, 'defect',
      'TECH_ISSUE', 1, 1, GETDATE(), GETDATE())
    
    SELECT TOP 1 request_id FROM spare_requests ORDER BY request_id DESC
  `, {
    replacements: [callId],
    type: QueryTypes.SELECT
  });

  const requestId = reqResult?.request_id;
  console.log(`✅ Request created: ID ${requestId}`);

  // Step 3: Check spare inventory exists
  console.log('\n✓ Step 3: Checking spare_inventory...');
  const [inv] = await sequelize.query(
    `SELECT TOP 1 spare_inventory_id, qty_good, qty_defective FROM spare_inventory`,
    { type: QueryTypes.SELECT }
  );
  
  if (inv) {
    console.log(`✅ Spare inventory exists: Good=${inv.qty_good}, Defective=${inv.qty_defective}`);
  } else {
    console.log(`⚠️  No spare inventory records yet`);
  }

  // Step 4: Check call_spare_usage
  console.log('\n✓ Step 4: Checking call_spare_usage table...');
  const [usage] = await sequelize.query(
    `SELECT TOP 1 usage_id, issued_qty, used_qty FROM call_spare_usage`,
    { type: QueryTypes.SELECT }
  );
  
  if (usage) {
    console.log(`✅ Usage records exist: ID=${usage.usage_id}`);
  } else {
    console.log(`⚠️  No usage records yet`);
  }

  // Step 5: Check return requests
  console.log('\n✓ Step 5: Checking technician_spare_returns...');
  const [ret] = await sequelize.query(
    `SELECT TOP 1 return_id, return_status FROM technician_spare_returns`,
    { type: QueryTypes.SELECT }
  );
  
  if (ret) {
    console.log(`✅ Return records exist: Status=${ret.return_status}`);
  } else {
    console.log(`⚠️  No return records yet`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ QUICK TEST COMPLETE - Database connections working!');
  console.log('='.repeat(70));

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.sql || '');
  process.exit(1);
} finally {
  await sequelize.close();
}
