// diagnostic.js
// Print RSM mappings, plants, and service centers for debugging plant assignment
import { sequelize } from './models/index.js';

async function printMappings() {
  console.log('--- RSM State Mappings ---');
  const rsmMappings = await sequelize.query(
    `SELECT * FROM rsm_state_mapping WHERE is_active = 1`,
    { type: sequelize.QueryTypes.SELECT }
  );
  console.table(rsmMappings);

  console.log('\n--- Plants (Branches) ---');
  const plants = await sequelize.query(
    `SELECT * FROM plants`,
    { type: sequelize.QueryTypes.SELECT }
  );
  console.table(plants);

  console.log('\n--- Service Centers ---');
  const serviceCenters = await sequelize.query(
    `SELECT * FROM service_centers`,
    { type: sequelize.QueryTypes.SELECT }
  );
  console.table(serviceCenters);

  await sequelize.close();
}

printMappings();
