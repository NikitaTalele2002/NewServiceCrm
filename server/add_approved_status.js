import { sequelize } from './db.js';

async function addStatusAndFix() {
  try {
    console.log('🔄 Setting up database for allocations...\n');

    // Add 'approved' status if it doesn't exist
    console.log('1️⃣ Checking/Adding approved status...');
    try {
      const approvedStatus = await sequelize.query(
        "SELECT status_id FROM [status] WHERE status_name = 'approved'",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      if (approvedStatus.length === 0) {
        await sequelize.query("INSERT INTO [status] (status_name) VALUES ('approved')");
        console.log('✅ Added "approved" status');
      } else {
        console.log('✅ "approved" status already exists (ID: ' + approvedStatus[0].status_id + ')');
      }
    } catch (err) {
      console.log('⚠️ Status check:', err.message);
    }

    // Show all statuses
    console.log('\n2️⃣ All statuses in database:');
    const allStatuses = await sequelize.query(
      'SELECT status_id, status_name FROM [status] ORDER BY status_id',
      { type: sequelize.QueryTypes.SELECT }
    );
    allStatuses.forEach(s => console.log(`  - ID ${s.status_id}: ${s.status_name}`));

    console.log('\n✅ Setup complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

addStatusAndFix();
