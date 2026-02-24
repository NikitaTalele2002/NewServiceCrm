import { sequelize } from './db.js';
import * as models from './models/index.js';
import { generateMockSAPData, formatSAPDataForDB } from './services/sapIntegration.js';

async function testSyncSAPEndpoint() {
  try {
    console.log('🔍 Testing Full Sync SAP Endpoint Logic\n');
    console.log('═'.repeat(70));

    const requestId = 26;

    // Step 1: Fetch spare request with items and SparePart
    console.log('\n1️⃣  Fetching spare request with items and spare parts...\n');
    
    const spareRequest = await sequelize.models.SpareRequest.findByPk(requestId, {
      include: [
        {
          model: sequelize.models.SpareRequestItem,
          as: 'SpareRequestItems',
          include: [
            {
              model: sequelize.models.SparePart,
              as: 'SparePart',
              attributes: ['Id', 'PART', 'DESCRIPTION', 'BRAND', 'MODEL_DESCRIPTION']
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
    console.log(`   First item SparePart:`, spareRequest.SpareRequestItems?.[0]?.SparePart?.dataValues);

    // Step 2: Get plant assignment
    console.log(`\n2️⃣  Getting plant assignment from service center...\n`);
    
    const serviceCenter = await sequelize.models.ServiceCenter.findByPk(spareRequest.requested_source_id);
    if (!serviceCenter) {
      console.log(`❌ Service center not found`);
      await sequelize.close();
      return;
    }

    const plantId = serviceCenter.plant_id;
    console.log(`✅ Plant ID: ${plantId}`);

    // Step 3: Check status
    console.log(`\n3️⃣  Checking request status...\n`);
    
    const status = await sequelize.models.Status.findByPk(spareRequest.status_id);
    const statusName = status?.status_name || '';
    
    if (statusName !== 'approved_by_rsm') {
      console.log(`❌ Status is "${statusName}", not "approved_by_rsm"`);
      await sequelize.close();
      return;
    }
    
    console.log(`✅ Status is approved_by_rsm`);

    // Step 4: Map items
    console.log(`\n4️⃣  Mapping spare request items...\n`);
    
    const items = (spareRequest.SpareRequestItems || []).map(item => {
      const sparePart = item.SparePart || {};
      return {
        spare_id: item.spare_id,
        part_id: item.spare_id,
        sku: sparePart.PART || `PART-${item.spare_id}`,
        spareName: sparePart.BRAND || sparePart.PART || 'Unknown Part',
        spare_description: sparePart.DESCRIPTION || sparePart.MODEL_DESCRIPTION || 'Part Description',
        requested_qty: item.requested_qty || 0,
        approved_qty: item.approved_qty || 0,
        uom: 'PCS',
        hsn: null
      };
    });
    
    console.log(`✅ Items mapped: ${items.length} items`);
    console.log(`   First item:`, items[0]);

    // Step 5: Generate SAP data
    console.log(`\n5️⃣  Generating mock SAP data...\n`);
    
    const sapData = generateMockSAPData(spareRequest, items);
    console.log(`✅ SAP data generated`);
    console.log(`   SO: ${sapData.salesOrder.document_number}`);
    console.log(`   DN: ${sapData.deliveryNote.document_number}`);
    console.log(`   CHALLAN: ${sapData.challan.document_number}`);
    console.log(`   Items in SO: ${sapData.salesOrder.items.length}`);
    console.log(`   First SO item spare_part_id:`, sapData.salesOrder.items[0].spare_part_id);

    // Step 6: Format for DB
    console.log(`\n6️⃣  Formatting SAP data for database...\n`);
    
    const formattedData = formatSAPDataForDB(
      sapData,
      { type: 'warehouse', id: plantId },
      { type: 'service_center', id: spareRequest.requested_source_id }
    );
    
    console.log(`✅ Data formatted`);
    console.log(`   Documents: ${formattedData.documents.length}`);
    formattedData.documents.forEach((doc, i) => {
      console.log(`     [${i}] ${doc.document_type}: ${doc.document_number} (${doc.items?.length || 0} items)`);
      if (doc.items && doc.items.length > 0) {
        console.log(`          First item spare_part_id: ${doc.items[0].spare_part_id}`);
      }
    });

    // Step 7: Try to create documents
    console.log(`\n7️⃣  Creating logistics documents in transaction...\n`);
    
    const transaction = await sequelize.transaction();
    
    try {
      const createdDocs = [];
      let dnDocument = null;
      
      for (const docData of formattedData.documents) {
        const { items: docItems, ...docRecord } = docData;
        
        console.log(`   Creating ${docRecord.document_type} (${docRecord.document_number})...`);

        // Create main document
        const logisticsDoc = await sequelize.models.LogisticsDocuments.create(
          docRecord,
          { transaction }
        );
        
        console.log(`   ✅ Document created: ID=${logisticsDoc.id}`);

        // Create line items
        console.log(`   Creating ${(docItems || []).length} items...`);
        for (const item of (docItems || [])) {
          console.log(`      Item spare_part_id=${item.spare_part_id}, qty=${item.supplied_qty || item.received_qty || 0}`);
          
          const created = await sequelize.models.LogisticsDocumentItems.create(
            {
              document_id: logisticsDoc.id,
              spare_part_id: item.spare_part_id,
              qty: item.supplied_qty || item.received_qty || 0,
              uom: item.uom || 'PCS',
              hsn: item.hsn || null
            },
            { transaction }
          );
          
          console.log(`      ✅ Item created: ID=${created.id}`);
        }

        if (docRecord.document_type === 'DN') {
          dnDocument = logisticsDoc;
        }

        createdDocs.push(logisticsDoc.toJSON());
      }

      // Create stock movement
      if (dnDocument) {
        console.log(`\n   Creating stock movement for DN ${dnDocument.document_number}...`);
        
        const totalQty = items.reduce((sum, item) => sum + (item.approved_qty || 0), 0);
        
        const stockMovement = await sequelize.models.StockMovement.create(
          {
            stock_movement_type: 'FILLUP_DISPATCH',
            reference_type: 'spare_request',
            reference_no: dnDocument.document_number,
            source_location_type: 'branch',
            source_location_id: plantId,
            destination_location_type: 'service_center',
            destination_location_id: spareRequest.requested_source_id,
            total_qty: totalQty,
            movement_date: new Date(),
            status: 'pending',
            created_by: 1
          },
          { transaction }
        );
        
        console.log(`   ✅ Stock movement created: ID=${stockMovement.movement_id}`);

        // Create cartons
        for (const item of items) {
          const carton = await sequelize.models.Cartons.create(
            {
              movement_id: stockMovement.movement_id,
              carton_number: `CTN-${dnDocument.document_number}-${item.spare_id}`,
              status: 'pending'
            },
            { transaction }
          );

          await sequelize.models.GoodsMovementItems.create(
            {
              movement_id: stockMovement.movement_id,
              carton_id: carton.carton_id,
              spare_part_id: item.spare_id,
              qty: item.approved_qty || 0,
              condition: 'good'
            },
            { transaction }
          );
        }
        
        console.log(`   ✅ Cartons and goods items created`);
      }

      // Commit
      await transaction.commit();
      console.log(`\n✅ Transaction committed successfully!`);
      console.log(`✅ All documents created successfully`);

    } catch (error) {
      await transaction.rollback();
      console.log(`\n❌ Error in transaction:`);
      console.log(`   Error: ${error.message}`);
      if (error.sql) {
        console.log(`   SQL: ${error.sql}`);
      }
      console.log(`   Stack: ${error.stack}`);
      throw error;
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR:');
    console.error(`   Message: ${error.message}`);
    if (error.sql) {
      console.error(`   SQL: ${error.sql}`);
    }
    console.error(`   Stack:\n${error.stack}`);
  } finally {
    await sequelize.close();
  }
}

testSyncSAPEndpoint();
