import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function checkStatus() {
  try {
    console.log('\n🔍 Checking status names in database...\n');

    const statuses = await sequelize.query(`
      SELECT DISTINCT status_id, status_name FROM [status] 
      WHERE status_name LIKE '%pending%' OR status_name LIKE '%Pending%'
    `, { type: QueryTypes.SELECT });

    console.log('Status values in database:');
    statuses.forEach(s => {
      console.log(`  ID ${s.status_id}: "${s.status_name}"`);
    });

    // Check Request 22's status
    const req = await sequelize.query(`
      SELECT sr.request_id, st.status_id, st.status_name
      FROM spare_requests sr
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.request_id = 22
    `, { type: QueryTypes.SELECT });

    console.log('\nRequest 22 Status:');
    console.log(`  status_name: "${req[0].status_name}"`);
    console.log(`  Lowercase: "${req[0].status_name.toLowerCase()}"`);

    // Test the FILTER
    console.log('\n\nTesting API filter:');
    console.log('Filter query: "AND st.status_name = \'pending\'"');
    
    const filtered = await sequelize.query(`
      SELECT COUNT(*) as count FROM spare_requests sr
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.requested_to_id = 1
        AND st.status_name = 'pending'
    `, { type: QueryTypes.SELECT });

    console.log(`Results for lowercase filter: ${filtered[0].count} requests`);

    const filtered2 = await sequelize.query(`
      SELECT COUNT(*) as count FROM spare_requests sr
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.requested_to_id = 1
        AND LOWER(st.status_name) = 'pending'
    `, { type: QueryTypes.SELECT });

    console.log(`Results with LOWER() function: ${filtered2[0].count} requests`);

    console.log();

  } finally {
    process.exit(0);
  }
}

checkStatus();
