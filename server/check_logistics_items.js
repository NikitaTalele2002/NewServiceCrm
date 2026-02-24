/**
 * Test script to verify spare_part_id is properly stored
 * Run after creating and tracking a spare request
 */

import { sequelize } from './db.js';

async function checkLogisticsItems() {
  try {
    console.log('Checking logistics_document_items for spare_part_id...\n');

    // Get the latest items with their documents
    const items = await sequelize.query(`
      SELECT 
        ldi.id,
        ldi.document_id,
        ldi.spare_part_id,
        ldi.qty,
        ldi.uom,
        ldi.hsn,
        ld.document_type,
        ld.document_number,
        ld.reference_id,
        sp.PART,
        sp.DESCRIPTION
      FROM logistics_document_items ldi
      JOIN logistics_documents ld ON ldi.document_id = ld.id
      LEFT JOIN spare_parts sp ON ldi.spare_part_id = sp.Id
      ORDER BY ldi.id DESC LIMIT 15
    `);

    if (items[0].length === 0) {
      console.log('❌ No logistics items found. Create a spare request and sync to SAP first.');
      process.exit(0);
    }

    console.log('✅ Found Logistics Items:\n');
    console.log('┌────┬──────────┬─────────────────┬─────┬──────┬─────┬──────────┬──────────────────┬─────────┬─────────────────────┐');
    console.log('│ ID │ Doc Type │ Spare Part ID   │ Qty │ UOM  │ HSN │ Doc Num  │ Ref ID  │ Part Code        │');
    console.log('├────┼──────────┼─────────────────┼─────┼──────┼─────┼──────────┼─────────┼──────────────────┤');

    let nullCount = 0;
    items[0].forEach(item => {
      const hasSpareId = item.spare_part_id !== null && item.spare_part_id !== undefined;
      const status = hasSpareId ? '✅' : '❌';
      if (!hasSpareId) nullCount++;

      const docType = (item.document_type || '').padEnd(8);
      const spareId = String(item.spare_part_id || 'NULL').padEnd(15);
      const qty = String(item.qty || 0).padEnd(5);
      const uom = (item.uom || 'PCS').padEnd(6);
      const hsn = (item.hsn || '-').padEnd(5);
      const docNum = (item.document_number || '').padEnd(10);
      const refId = String(item.reference_id || '').padEnd(7);
      const partCode = (item.PART || 'Unknown').substring(0, 18).padEnd(20);

      console.log(`│    │ ${status} ${docType} │ ${spareId} │ ${qty} │ ${uom} │ ${hsn} │ ${docNum} │ ${refId} │ ${partCode} │`);
    });

    console.log('└────┴──────────┴─────────────────┴─────┴──────┴─────┴──────────┴─────────┴──────────────────┘');

    console.log(`\n📊 Summary: ${items[0].length} items found`);
    console.log(`✅ Populated: ${items[0].length - nullCount}`);
    console.log(`❌ NULL spare_part_id: ${nullCount}`);

    if (nullCount > 0) {
      console.log('\n⚠️  WARNING: Some items have NULL spare_part_id!');
      console.log('This needs to be fixed in the code.');
    } else {
      console.log('\n✅ All spare_part_id values are properly populated!');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

checkLogisticsItems();
