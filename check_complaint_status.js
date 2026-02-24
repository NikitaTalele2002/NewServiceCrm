/**
 * Test script to verify complaint registration
 * Uses the existing server connection
 */

const path = require('path');
const serverPath = path.join(__dirname, 'server');

// Add server to path
process.env.NODE_PATH = serverPath;

console.log('📋 Complaint Registration Verification');
console.log('=====================================\n');

async function checkComplaints() {
  try {
    // Import from server
    const db = await import('./server/db.js').catch(() => null);
    
    if (!db) {
      console.error('❌ Could not load database module');
      return false;
    }

    const sequelize = db.default || db;
    
    console.log('✅ Database connected\n');

    // Query for latest complaints
    console.log('📊 Fetching latest complaints from database...\n');
    
    const result = await sequelize.query(`
      SELECT TOP 5
        call_id,
        customer_id,
        customer_product_id,
        call_type,
        remark,
        visit_date,
        visit_time,
        created_at
      FROM calls
      ORDER BY call_id DESC
    `);

    const complaints = result[0];

    if (complaints && complaints.length > 0) {
      console.log(`✅ Found ${complaints.length} recent complaint(s):\n`);
      
      complaints.forEach((complaint, i) => {
        console.log(`${i + 1}. Call ID: ${complaint.call_id}`);
        console.log(`   Customer: ${complaint.customer_id} | Product: ${complaint.customer_product_id}`);
        console.log(`   Type: ${complaint.call_type}`);
        console.log(`   Remark: ${complaint.remark}`);
        console.log(`   Visit Date: ${complaint.visit_date}`);
        console.log(`   Visit Time: ${complaint.visit_time}`);
        console.log(`   Created: ${complaint.created_at}\n`);
      });

      return true;
    } else {
      console.log('⚠️ No complaints found\n');
      return false;
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    return false;
  }
}

checkComplaints().then(success => {
  process.exit(success ? 0 : 1);
});
