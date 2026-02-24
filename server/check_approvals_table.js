import sql from 'mssql';

const dbConfig = {
  server: 'localhost',
  user: 'crm_user',
  password: 'StrongPassword123!',
  database: 'ServiceCrm',
  options: {
    instanceName: 'SQLEXPRESS',
    encrypt: false,
    trustServerCertificate: true,
  }
};

async function checkApprovals() {
  const pool = new sql.ConnectionPool(dbConfig);
  try {
    await pool.connect();
    
    console.log('✅ APPROVAL TRACKING VERIFICATION\n');
    console.log('═'.repeat(70));
    
    // Check approvals table structure
    console.log('1️⃣  Checking approvals table structure:');
    const structResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'approvals'
      ORDER BY ORDINAL_POSITION
    `);
    
    if (structResult.recordset.length === 0) {
      console.log('   ❌ approvals table does not exist!');
      return;
    }
    
    console.log('   approvals table columns:');
    for (const col of structResult.recordset) {
      console.log(`   ✓ ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
    }
    
    // Count approvals by entity type
    console.log('\n2️⃣  Approvals by entity type:');
    const entityResult = await pool.request().query(`
      SELECT entity_type, COUNT(*) as cnt FROM approvals
      GROUP BY entity_type
      ORDER BY cnt DESC
    `);
    
    for (const row of entityResult.recordset) {
      console.log(`   - ${row.entity_type}: ${row.cnt}`);
    }
    
    // Check return_request approvals
    console.log('\n3️⃣  Return Request Approvals:');
    const returnApprResult = await pool.request().query(`
      SELECT COUNT(*) as cnt FROM approvals 
      WHERE entity_type = 'return_request'
    `);
    const returnAppCount = returnApprResult.recordset[0].cnt;
    console.log(`   Total: ${returnAppCount}`);
    
    if (returnAppCount > 0) {
      console.log('\n4️⃣  Recent Return Request Approvals:');
      const recentResult = await pool.request().query(`
        SELECT TOP 10
          approval_id, entity_id, approval_level, approval_status, 
          approver_user_id, approval_remarks, approved_at
        FROM approvals
        WHERE entity_type = 'return_request'
        ORDER BY approval_id DESC
      `);
      
      for (const app of recentResult.recordset) {
        console.log(`
   Approval ID: ${app.approval_id}
   ├─ Return Request: ${app.entity_id}
   ├─ Level: ${app.approval_level}
   ├─ Status: ${app.approval_status}
   ├─ Approver User ID: ${app.approver_user_id}
   ├─ Remarks: ${app.approval_remarks}
   └─ Approved At: ${app.approved_at}`);
      }
    } else {
      console.log('\n   ⚠️ No return_request approvals found yet');
      console.log('   Approvals will be created when you approve a return request');
    }
    
    // Check approvals by status
    console.log('\n5️⃣  Approvals by Status:');
    const statusResult = await pool.request().query(`
      SELECT approval_status, COUNT(*) as cnt FROM approvals
      WHERE entity_type = 'return_request'
      GROUP BY approval_status
    `);
    
    for (const row of statusResult.recordset) {
      console.log(`   - ${row.approval_status}: ${row.cnt}`);
    }
    
    console.log('\n═'.repeat(70));
    console.log('✅ Approvals table is ready for tracking!');
    console.log('\nApproval records will be created when:');
    console.log('  ✓ ASC approves a return request');
    console.log('  ✓ ASC rejects a return request');
    console.log('\nEach approval record contains:');
    console.log('  ✓ entity_type: "return_request"');
    console.log('  ✓ entity_id: return request ID');
    console.log('  ✓ approval_level: 1 (ASC level)');
    console.log('  ✓ approver_user_id: user who approved');
    console.log('  ✓ approval_status: "approved" or "rejected"');
    console.log('  ✓ approval_remarks: approval details');
    console.log('  ✓ approved_at: timestamp of approval');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.close();
  }
}

checkApprovals();
