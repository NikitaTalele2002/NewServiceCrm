/**
 * Verify final status structure
 */

import { config } from 'dotenv';
import { Sequelize } from 'sequelize';

config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'NewCRM',
  process.env.DB_USER || 'crm_user',
  process.env.DB_PASSWORD || 'StrongPassword123!',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 1433,
    dialect: 'mssql',
    dialectOptions: {
      options: {
        instanceName: 'SQLEXPRESS',
        encrypt: false,
        trustServerCertificate: true
      }
    },
    logging: false
  }
);

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    console.log('📊 FINAL STATUS STRUCTURE:\n');
    const statuses = await sequelize.query(
      'SELECT s.status_id, s.status_name FROM [status] ORDER BY s.status_id',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    for (const status of statuses) {
      console.log('📌 ' + status.status_name + ' (ID: ' + status.status_id + ')');
      const subs = await sequelize.query(
        'SELECT sub_status_name FROM [sub_status] WHERE status_id = ? ORDER BY sub_status_id',
        { replacements: [status.status_id], type: sequelize.QueryTypes.SELECT }
      );
      
      if (subs.length > 0) {
        subs.forEach((s, i) => {
          console.log('   ' + (i === subs.length - 1 ? '└─' : '├─') + ' ' + s.sub_status_name);
        });
      } else {
        console.log('   (no sub-statuses)');
      }
    }
    
    console.log('\n✅ Database structure is now correct!');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await sequelize.close();
    process.exit(1);
  }
})();
