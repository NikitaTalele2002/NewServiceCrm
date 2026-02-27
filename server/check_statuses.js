import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function checkStatuses() {
  try {
    const statuses = await sequelize.query(
      'SELECT TOP 30 status_id, status_name FROM status ORDER BY status_id',
      { type: QueryTypes.SELECT }
    );
    
    console.log('\n📋 Existing Statuses in Database:');
    console.log('==================================');
    statuses.forEach(s => {
      console.log(`ID: ${s.status_id} | Name: "${s.status_name}"`);
    });
    
    // Check if "Pending Cancellation" exists
    const pendingCancellation = statuses.find(s => s.status_name.toLowerCase().includes('cancellation'));
    console.log('\n🔍 Pending Cancellation Status Found:', pendingCancellation || 'NOT FOUND');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkStatuses();
