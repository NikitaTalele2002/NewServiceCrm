// Check what statuses exist in SpareRequests table
import { sequelize } from './server/db.js';

async function checkStatus() {
  try {
    const result = await sequelize.query(`
      SELECT DISTINCT Status, COUNT(*) as count
      FROM SpareRequests
      GROUP BY Status
      ORDER BY count DESC
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('Statuses in SpareRequests:');
    result.forEach(row => {
      console.log(`  ${row.Status || 'NULL'}: ${row.count} requests`);
    });
    
    console.log('\nSample requests:');
    const samples = await sequelize.query(`
      SELECT TOP 15 Id, RequestNumber, Status, TechnicianId, ServiceCenterId, CreatedAt
      FROM SpareRequests
      ORDER BY CreatedAt DESC
    `, { type: sequelize.QueryTypes.SELECT });
    
    samples.forEach(req => {
      console.log(`  ID: ${req.Id}, #: ${req.RequestNumber}, Status: ${req.Status}, Tech: ${req.TechnicianId}, SC: ${req.ServiceCenterId}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkStatus();
