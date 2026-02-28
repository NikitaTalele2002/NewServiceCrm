// Test SAP Documents and SAP Document Items creation
import 'dotenv/config.js';
import { sequelize, connectDB } from './server/db.js';
import { SAPDocuments, SAPDocumentItems, SpareRequest, LogisticsDocuments, StockMovement } from './server/models/index.js';

async function testSAPDocumentsAndItems() {
  try {
    console.log('='.repeat(80));
    console.log('DATABASE CHECK: SAP Documents and SAP Document Items');
    console.log('='.repeat(80));

    await connectDB();
    console.log('\n✅ Connected to database');

    // Get recent spare requests that are approved
    console.log('\n[STEP 1] Finding recent approved spare requests...');
    const approvedRequests = await SpareRequest.findAll({
      where: { status: 'approved_by_rsm' },
      order: [['request_id', 'DESC']],
      limit: 5,
      raw: true
    });

    if (approvedRequests.length === 0) {
      console.log('❌ No approved spare requests found');
      await sequelize.close();
      return;
    }

    console.log(`✅ Found ${approvedRequests.length} approved request(s)\n`);

    for (const request of approvedRequests) {
      const requestId = request.request_id;
      console.log('='.repeat(80));
      console.log(`REQUEST ID: SR-${requestId}`);
      console.log('='.repeat(80));

      // Check Delivery Note
      console.log('\n[CHECK 1] Delivery Note (logistics_documents)');
      const dnDoc = await LogisticsDocuments.findOne({
        where: { reference_id: requestId, document_type: 'DN' },
        raw: true
      });

      if (dnDoc) {
        console.log(`✅ DN Found:`);
        console.log(`   Document Number: ${dnDoc.document_number}`);
        console.log(`   From: ${dnDoc.from_entity_type} (ID: ${dnDoc.from_entity_id})`);
        console.log(`   To: ${dnDoc.to_entity_type} (ID: ${dnDoc.to_entity_id})`);
        console.log(`   Status: ${dnDoc.status}`);
      } else {
        console.log('❌ No Delivery Note found');
      }

      // Check Stock Movement
      console.log('\n[CHECK 2] Stock Movement');
      const stockMovement = await StockMovement.findOne({
        where: { reference_id: requestId },
        raw: true,
        order: [['movement_id', 'DESC']]
      });

      if (stockMovement) {
        console.log(`✅ Stock Movement Found:`);
        console.log(`   Movement ID: ${stockMovement.movement_id}`);
        console.log(`   Reference Type: ${stockMovement.reference_type}`);
        console.log(`   Reference No: ${stockMovement.reference_no}`);
        console.log(`   Source: ${stockMovement.source_location_type} (ID: ${stockMovement.source_location_id})`);
        console.log(`   Destination: ${stockMovement.destination_location_type} (ID: ${stockMovement.destination_location_id})`);
      } else {
        console.log('❌ No Stock Movement found');
      }

      // Check SAP Documents (Invoice)
      console.log('\n[CHECK 3] SAP Document (Invoice)');
      const sapDoc = await SAPDocuments.findOne({
        where: { 
          reference_id: requestId,
          sap_doc_type: 'INVOICE'
        },
        raw: true
      });

      if (sapDoc) {
        console.log(`✅ SAP Document (Invoice) Found:`);
        console.log(`   ID: ${sapDoc.id}`);
        console.log(`   SAP Doc Number: ${sapDoc.sap_doc_number}`);
        console.log(`   SAP Doc Type: ${sapDoc.sap_doc_type}`);
        console.log(`   Module Type: ${sapDoc.module_type}`);
        console.log(`   Reference ID: ${sapDoc.reference_id}`);
        console.log(`   ASC ID: ${sapDoc.asc_id || 'NULL'}`);
        console.log(`   Amount: ${sapDoc.amount || 'NULL'}`);
        console.log(`   Status: ${sapDoc.status}`);
        console.log(`   Created At: ${sapDoc.created_at}`);

        // Check SAP Document Items
        console.log('\n[CHECK 4] SAP Document Items');
        const sapItems = await SAPDocumentItems.findAll({
          where: { sap_doc_id: sapDoc.id },
          raw: true
        });

        if (sapItems.length > 0) {
          console.log(`✅ SAP Document Items Found: ${sapItems.length} item(s)`);
          sapItems.forEach((item, idx) => {
            console.log(`\n   Item ${idx + 1}:`);
            console.log(`     - ID: ${item.id}`);
            console.log(`     - SAP Doc ID: ${item.sap_doc_id}`);
            console.log(`     - Spare Part ID: ${item.spare_part_id}`);
            console.log(`     - Qty: ${item.qty}`);
            console.log(`     - Unit Price: ${item.unit_price}`);
            console.log(`     - GST: ${item.gst}%`);
            console.log(`     - HSN: ${item.hsn || 'NULL'}`);
          });
        } else {
          console.log('❌ No SAP Document Items found for this invoice');
        }
      } else {
        console.log('❌ No SAP Document (Invoice) found');
      }
    }

    // Summary Query
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY STATISTICS');
    console.log('='.repeat(80));

    const totalSAPDocs = await SAPDocuments.count({ where: { sap_doc_type: 'INVOICE' } });
    const totalSAPItems = await SAPDocumentItems.count();
    const totalDNs = await LogisticsDocuments.count({ where: { document_type: 'DN' } });
    const totalStockMovements = await StockMovement.count();

    console.log(`Total SAP Documents (INVOICE): ${totalSAPDocs}`);
    console.log(`Total SAP Document Items: ${totalSAPItems}`);
    console.log(`Total Delivery Notes: ${totalDNs}`);
    console.log(`Total Stock Movements: ${totalStockMovements}`);

    console.log('\n' + '='.repeat(80));

    await sequelize.close();
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testSAPDocumentsAndItems();
