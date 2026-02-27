/**
 * Simple SQL query to check status
 */

import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('NewCRM', 'crm_user', 'StrongPassword123!', {
  host: 'localhost',
  dialect: 'mssql',
  dialectOptions: {
    options: {
      instanceName: 'SQLEXPRESS',
      encrypt: false,
      trustServerCertificate: true
    }
  },
  logging: console.log
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('\n✅ Connected\n');
    
    const result = await sequelize.query(`
      SELECT s.status_id, s.status_name, 
             (SELECT COUNT(*) FROM [sub_status] WHERE status_id = s.status_id) as sub_count
      FROM [status] s 
      ORDER BY s.status_id
    `);
    
    console.log('\n📋 Status Count Result:');
    console.log(result[0]);
    
    await sequelize.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
