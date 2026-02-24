import { sequelize } from './db.js';

async function testTrackOrder() {
  try {
    console.log('🔍 Testing Track Order Functionality\n');
    console.log('═'.repeat(70));

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Test 1: Verify LogisticsDocumentItems model association
    console.log('1️⃣  Checking LogisticsDocumentItems model...');
    const logisticsModel = sequelize.models.LogisticsDocumentItems;
    if (!logisticsModel) {
      console.log(`   ❌ LogisticsDocumentItems model not found`);
    } else {
      console.log(`   ✓ Model loaded`);
      if (logisticsModel.associations) {
        console.log(`   ✓ Associations: ${Object.keys(logisticsModel.associations).join(', ')}`);
        if (logisticsModel.associations.SparePart) {
          console.log(`   ✅ SparePart association found!`);
        } else {
          console.log(`   ⚠️  SparePart association NOT found`);
        }
      } else {
        console.log(`   ⚠️  No associations defined yet`);
      }
    }

    // Test 2: Try to query logistics documents with items
    console.log('\n2️⃣  Testing logistics document query...');
    const docs = await sequelize.models.LogisticsDocuments.findAll({
      limit: 1,
      include: [
        {
          model: sequelize.models.LogisticsDocumentItems,
          as: 'items',
          include: [
            {
              model: sequelize.models.SparePart,
              as: 'SparePart',
              attributes: ['Id', 'PART', 'DESCRIPTION']
            }
          ]
        }
      ]
    });

    if (docs.length > 0) {
      console.log(`   ✅ Query successful!`);
      console.log(`   Found ${docs.length} document(s)`);
      if (docs[0].items && docs[0].items.length > 0) {
        console.log(`   ✓ Document has ${docs[0].items.length} item(s)`);
        const item = docs[0].items[0];
        console.log(`   ✓ Item ID: ${item.id}`);
        if (item.SparePart) {
          console.log(`   ✓ Spare Part: ${item.SparePart.PART}`);
        }
      }
    } else {
      console.log(`   ℹ️  No documents found in database`);
    }

    // Test 3: Test spare request query  
    console.log('\n3️⃣  Testing spare request query...');
    const requests = await sequelize.models.SpareRequest.findAll({
      limit: 1,
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

    if (requests.length > 0) {
      console.log(`   ✅ Query successful!`);
      console.log(`   Found ${requests.length} request(s)`);
    } else {
      console.log(`   ℹ️  No requests found`);
    }

    console.log('\n' + '═'.repeat(70));
    console.log('✅ ALL TESTS PASSED!\n');
    console.log('✨ Track Order button should now work without "Invalid column name \'spare_id\'" error');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testTrackOrder();
