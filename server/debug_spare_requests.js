import { sequelize } from './db.js';

async function check() {
  try {
    console.log('📊 Checking data in spare_requests...\n');

    // Check all data
    console.log('1️⃣ Getting first record from spare_requests...');
    const sample = await sequelize.query(`
      SELECT TOP 1 *
      FROM spare_requests
      ORDER BY request_id DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (sample.length > 0) {
      console.log('✅ Sample record:');
      Object.keys(sample[0]).forEach(key => {
        console.log(`  ${key}: ${sample[0][key]}`);
      });
    }

    // Check status_id = 3 count
    console.log('\n2️⃣ Count of allocated requests (status_id = 3):');
    const count = await sequelize.query(`
      SELECT COUNT(*) as cnt FROM spare_requests WHERE status_id = 3
    `, { type: sequelize.QueryTypes.SELECT });
    console.log(`  Count: ${count[0].cnt}`);

    // Check all records with status
    console.log('\n3️⃣ All records with status info:');
    const all = await sequelize.query(`
      SELECT TOP 10 request_id, request_type, status_id, requested_source_type, requested_source_id
      FROM spare_requests
      ORDER BY request_id DESC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`  Total: ${all.length}`);
    all.forEach(r => {
      console.log(`  ID: ${r.request_id}, Type: ${r.request_type}, Status: ${r.status_id}, Source: ${r.requested_source_type}, SourceID: ${r.requested_source_id}`);
    });

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await sequelize.close();
  }
}

check();
