import { sequelize } from './db.js';

console.log('\n📋 === SPARE REQUEST 25 DETAILS ===\n');

try {
  const sr = await sequelize.query(`
    SELECT request_id, requested_source_id, status_id, created_at FROM spare_requests WHERE request_id = 25
  `, { type: sequelize.QueryTypes.SELECT });

  if (sr.length > 0) {
    console.log('Spare Request 25:');
    console.log(`  ID: ${sr[0].request_id}`);
    console.log(`  Plant (requested_from): ${sr[0].requested_source_id}`);
    console.log(`  Status ID: ${sr[0].status_id}\n`);
  } else {
    console.log('❌ Spare Request 25 not found\n');
  }

  // Check what plants/ASCs are available
  console.log('📝 Available Plants:');
  const plants = await sequelize.query(`
    SELECT plant_id FROM plants ORDER BY plant_id
  `, { type: sequelize.QueryTypes.SELECT });
  console.log(`Plant IDs: ${plants.map(p => p.plant_id).join(', ')}\n`);

  console.log('📝 Available Service Centers:');
  const asc = await sequelize.query(`
    SELECT asc_id, asc_name FROM service_centers ORDER BY asc_id
  `, { type: sequelize.QueryTypes.SELECT });
  asc.forEach(a => console.log(`  ${a.asc_id}: ${a.asc_name}`));
  console.log('\n');

  // Check inventory for the correct locations
  console.log('📝 Inventory for Spare 0:');
  const inv = await sequelize.query(`
    SELECT location_type, location_id, qty_good FROM spare_inventory 
    WHERE spare_id = 0 
    ORDER BY location_type, location_id
  `, { type: sequelize.QueryTypes.SELECT });

  inv.forEach(row => {
    console.log(`  ${row.location_type}-${row.location_id}: ${row.qty_good}`);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
}

await sequelize.close();
