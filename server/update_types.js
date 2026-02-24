import { sequelize } from './models/index.js';

async function updateRequestTypes() {
  try {
    await sequelize.authenticate();
    console.log('Connected');

    // Update returns
    await sequelize.query("UPDATE SpareRequests SET RequestType = 'return' WHERE Status = 'Return Requested'", { type: sequelize.QueryTypes.UPDATE });
    console.log('Updated returns');

    // Update orders
    await sequelize.query("UPDATE SpareRequests SET RequestType = 'order' WHERE RequestType IS NULL", { type: sequelize.QueryTypes.UPDATE });
    console.log('Updated orders');

    console.log('Done');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

updateRequestTypes();