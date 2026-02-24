import { sequelize } from './db.js';
import * as models from './models/index.js';

async function testSyncSAP() {
  try {
    console.log('🔍 Testing Sync SAP Endpoint\n');
    console.log('═'.repeat(70));

    // Test: Fetch spare request with items
    console.log('1️⃣  Fetching spare request with items...\n');
    
    const requestId = 26; // Use an existing request ID
    
    const spareRequest = await sequelize.models.SpareRequest.findByPk(requestId, {
      include: [
        {
          model: sequelize.models.SpareRequestItem,
          as: 'SpareRequestItems',
          include: [
            {
              model: sequelize.models.SparePart,
              as: 'SparePart'
            }
          ]
        }
      ]
    });

    if (!spareRequest) {
      console.log(`❌ Request ${requestId} not found`);
      await sequelize.close();
      return;
    }

    console.log(`✅ Request found: ID=${spareRequest.request_id}`);
    console.log(`   Items: ${spareRequest.SpareRequestItems?.length || 0}`);
    
    if (spareRequest.SpareRequestItems && spareRequest.SpareRequestItems.length > 0) {
      const item = spareRequest.SpareRequestItems[0];
      console.log(`   First item: spare_id=${item.spare_id}`);
      if (item.SparePart) {
        console.log(`   ✓ SparePart loaded: ${item.SparePart.PART}`);
      } else {
        console.log(`   ⚠️  SparePart is null`);
      }
    }

    // Test: Check service center
    console.log(`\n2️⃣  Checking service center for plant assignment...\n`);
    const serviceCenter = await sequelize.models.ServiceCenter.findByPk(spareRequest.requested_source_id);
    if (serviceCenter) {
      console.log(`✅ Service Center found: ID=${serviceCenter.id}`);
      console.log(`   Plant ID: ${serviceCenter.plant_id}`);
    } else {
      console.log(`❌ Service Center not found`);
    }

    // Test: Check status
    console.log(`\n3️⃣  Checking request status...\n`);
    const status = await sequelize.models.Status.findByPk(spareRequest.status_id);
    if (status) {
      console.log(`✅ Status found: ${status.status_name}`);
      console.log(`   Required for sync-sap: "approved_by_rsm"`);
      console.log(`   Current: "${status.status_name}"`);
      if (status.status_name === 'approved_by_rsm') {
        console.log(`   ✅ Request is ready for SAP sync`);
      } else {
        console.log(`   ❌ Request must be approved by RSM first`);
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('✅ All sync-sap prerequisites check completed!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull Error:');
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

testSyncSAP();
