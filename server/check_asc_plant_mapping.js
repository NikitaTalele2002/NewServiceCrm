import { sequelize } from './db.js';

console.log('\n📋 === SERVICE CENTER AND PLANT RELATIONSHIP ===\n');

try {
  // Check service center columns
  const scColumns = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'service_centers'
    ORDER BY ORDINAL_POSITION
  `, { type: sequelize.QueryTypes.SELECT });

  console.log('Service Centers Columns:');
  scColumns.forEach(col => console.log(`  - ${col.COLUMN_NAME}`));

  // Check actual service center data
  const serviceCenters = await sequelize.query(`
    SELECT TOP 10 asc_id, asc_name, plant_id FROM service_centers
  `, { type: sequelize.QueryTypes.SELECT });

  console.log('\nService Centers with Plant Assignment:');
  serviceCenters.forEach(sc => {
    console.log(`  ASC ${sc.asc_id}: ${sc.asc_name} → Plant ${sc.plant_id}`);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
}

await sequelize.close();
