import { sequelize } from './db.js';

async function check() {
  try {
    const result = await sequelize.query(
      `SELECT DISTINCT location_type, COUNT(*) as cnt FROM spare_inventory GROUP BY location_type ORDER BY location_type`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('Location types in database:');
    result.forEach(r => console.log(`  ${r.location_type}: ${r.cnt} records`));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
