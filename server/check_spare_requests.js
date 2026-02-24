import { sequelize } from './db.js';

async function checkSpareRequests() {
  try {
    console.log('\nChecking existing spare requests...\n');
    
    const requests = await sequelize.models.SpareRequest.findAll({
      limit: 10,
      order: [['id', 'DESC']],
      include: [
        {
          model: sequelize.models.SpareRequestItem,
          as: 'SpareRequestItems',
          limit: 3
        }
      ]
    });

    if (requests.length === 0) {
      console.log('No spare requests found in database');
      return;
    }

    requests.forEach(req => {
      console.log(`\n📋 Request ID: ${req.id}`);
      console.log(`   Requested Source ID: ${req.requested_source_id} (ASC)`);
      console.log(`   Requested To ID: ${req.requested_to_id} (Plant)`);
      console.log(`   Status ID: ${req.status_id}`);
      console.log(`   Items: ${req.SpareRequestItems?.length || 0}`);
      
      if (req.SpareRequestItems && req.SpareRequestItems.length > 0) {
        req.SpareRequestItems.forEach(item => {
          console.log(`     - Spare ${item.spare_id}: ${item.requested_qty} qty`);
        });
      }
    });

    // Get the latest request that can be used for testing
    if (requests.length > 0) {
      const latestRequest = requests[0];
      console.log(`\n✅ Use Request ID ${latestRequest.id} for testing`);
      console.log(`   ASC: ${latestRequest.requested_source_id}`);
      console.log(`   Plant: ${latestRequest.requested_to_id}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkSpareRequests();
