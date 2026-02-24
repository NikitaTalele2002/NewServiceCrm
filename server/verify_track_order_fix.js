import { sequelize } from './db.js';
import * as models from './models/index.js';

async function testTrackOrderFix() {
  try {
    console.log('🔍 Testing Track Order Fix\n');
    console.log('═'.repeat(70));

    // Debug: Check what we have
    console.log('Models loaded:', Object.keys(models).length > 0 ? 'Yes' : 'No');

    // Test: Try to query a logistics document with its items and spare parts
    console.log('Testing logistics documents query with SparePart associations...\n');
    
    const docs = await sequelize.models.LogisticsDocuments.findAll({
      limit: 5,
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
      console.log(`✅ Query successful!\n`);
      console.log(`Found ${docs.length} logistics document(s):\n`);
      
      for (const doc of docs) {
        console.log(`Document: ${doc.document_number} (${doc.document_type})`);
        if (doc.items && doc.items.length > 0) {
          console.log(`  Items: ${doc.items.length}`);
          for (const item of doc.items.slice(0, 3)) {
            const spare = item.SparePart;
            console.log(`    - Item ${item.id}: ${spare ? spare.PART : 'N/A'} (Qty: ${item.qty})`);
          }
          if (doc.items.length > 3) {
            console.log(`    ... and ${doc.items.length - 3} more items`);
          }
        } else {
          console.log(`  No items in this document`);
        }
        console.log();
      }
    } else {
      console.log('✅ Query executed successfully (no documents in database)\n');
    }

    console.log('═'.repeat(70));
    console.log('\n✅ TRACK ORDER FIX VERIFIED!\n');
    console.log('The error "Invalid column name \'spare_id\'" has been fixed by:');
    console.log('  1. Correcting LogisticsDocumentItems foreign key reference');
    console.log('     from: model="spare_part", key="spare_id"');
    console.log('     to:   model="spare_parts", key="Id"');
    console.log('  2. Adding LogisticsDocumentItems <-> SparePart association\n');
    console.log('🎉 The Track Order button should now work properly!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.sql) {
      console.error('\nSQL:', error.sql.substring(0, 100));
    }
    console.error('\nFull error:');
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testTrackOrderFix();
