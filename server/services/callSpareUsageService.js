/**
 * Service for handling call spare usage tracking
 * Records when technician uses spares during a call and updates inventory
 */

import { sequelize } from '../db.js';
import { QueryTypes } from 'sequelize';

/**
 * Record spare usage for a call
 * Updates CallSpareUsage table and adjusts technician inventory
 * 
 * @param {number} callId - Call ID
 * @param {number} technicianId - Technician ID
 * @param {Array} spareUsage - Array of {spareId, usedQty, defectiveQty}
 * @param {Sequelize.Transaction} transaction - Database transaction
 * @returns {Object} Result with created records
 */
export async function recordCallSpareUsage(callId, technicianId, spareUsage, transaction) {
  console.log('\n' + '='.repeat(60));
  console.log('📝 RECORDING CALL SPARE USAGE');
  console.log('='.repeat(60));

  const createdRecords = [];
  const inventoryUpdates = [];

  try {
    // Get technician details
    const techDetails = await sequelize.query(`
      SELECT technician_id, service_center_id FROM technicians WHERE technician_id = ?
    `, { 
      replacements: [technicianId], 
      type: QueryTypes.SELECT, 
      transaction 
    });

    if (!techDetails || techDetails.length === 0) {
      throw new Error(`Technician ${technicianId} not found`);
    }

    console.log(`✅ Technician verified: ID ${technicianId}`);

    for (const item of spareUsage) {
      const { spareId, usedQty = 0, defectiveQty = 0, remarks } = item;

      console.log(`\n   Processing spare ${spareId}: used=${usedQty}, defective=${defectiveQty}`);

      // Validate spare exists
      const spare = await sequelize.query(`
        SELECT Id, PART, DESCRIPTION FROM spare_parts WHERE Id = ?
      `, { 
        replacements: [spareId], 
        type: QueryTypes.SELECT, 
        transaction 
      });

      if (!spare || spare.length === 0) {
        throw new Error(`Spare ${spareId} not found`);
      }

      const sparePart = spare[0];
      const totalUsed = usedQty + defectiveQty;

      // Create CallSpareUsage record
      const [callUsageRecord] = await sequelize.query(`
        INSERT INTO call_spare_usage (
          call_id,
          spare_part_id,
          issued_qty,
          used_qty,
          returned_qty,
          usage_status,
          used_by_tech_id,
          used_at,
          remarks,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE(), ?, GETDATE(), GETDATE())
        
        SELECT usage_id FROM call_spare_usage WHERE call_id = ? AND spare_part_id = ?
          ORDER BY usage_id DESC LIMIT 1
      `, {
        replacements: [
          callId,
          spareId,
          totalUsed,           // issued_qty
          usedQty,              // used_qty
          defectiveQty,         // returned_qty (collected defective)
          usedQty > 0 ? 'USED' : (defectiveQty > 0 ? 'PARTIAL' : 'NOT_USED'),
          technicianId,
          remarks || null,
          callId,
          spareId
        ],
        type: QueryTypes.SELECT,
        transaction
      });

      if (callUsageRecord && callUsageRecord.usage_id) {
        createdRecords.push({
          usageId: callUsageRecord.usage_id,
          spareId,
          spareName: sparePart.DESCRIPTION,
          usedQty,
          defectiveQty
        });
        console.log(`     ✓ CallSpareUsage record created (ID: ${callUsageRecord.usage_id})`);
      }

      // Update technician inventory
      // Decrease good inventory (used + defective collected)
      // Increase defective inventory (defective from replacement)
      console.log(`     Step 2: Updating technician inventory...`);

      const invUpdate = await sequelize.query(`
        UPDATE spare_inventory
        SET 
          qty_good = qty_good - ?,
          qty_defective = qty_defective + ?,
          updated_at = GETDATE()
        WHERE spare_id = ?
          AND location_type = 'technician'
          AND location_id = ?
      `, {
        replacements: [
          totalUsed,    // Decrease good (used + defective collected)
          defectiveQty, // Increase defective (collected defective spare)
          spareId,
          technicianId
        ],
        transaction
      });

      inventoryUpdates.push({
        spareId,
        spareName: sparePart.DESCRIPTION,
        goodDecreased: totalUsed,
        defectiveIncreased: defectiveQty
      });

      console.log(`     ✓ Inventory updated: Good -${totalUsed}, Defective +${defectiveQty}`);
    }

    console.log(`\n✅ Call spare usage recorded successfully`);
    console.log(`   Records created: ${createdRecords.length}`);
    console.log(`   Inventory updates: ${inventoryUpdates.length}`);

    return {
      success: true,
      callId,
      technicianId,
      usageRecords: createdRecords,
      inventoryUpdates: inventoryUpdates
    };

  } catch (error) {
    console.error('❌ Error recording call spare usage:', error.message);
    throw error;
  }
}

/**
 * Get call spare usage for a specific call
 * @param {number} callId - Call ID
 * @returns {Array} Spare usage records for the call
 */
export async function getCallSpareUsage(callId) {
  try {
    const usage = await sequelize.query(`
      SELECT 
        csu.usage_id,
        csu.call_id,
        csu.spare_part_id,
        csu.issued_qty,
        csu.used_qty,
        csu.returned_qty,
        csu.usage_status,
        csu.used_by_tech_id,
        csu.used_at,
        csu.remarks,
        sp.PART as spare_code,
        sp.DESCRIPTION as spare_name,
        sp.BRAND as spare_brand,
        u.name as technician_name
      FROM call_spare_usage csu
      LEFT JOIN spare_parts sp ON csu.spare_part_id = sp.Id
      LEFT JOIN users u ON csu.used_by_tech_id = u.user_id
      WHERE csu.call_id = ?
      ORDER BY csu.created_at DESC
    `, {
      replacements: [callId],
      type: QueryTypes.SELECT
    });

    return usage;
  } catch (error) {
    console.error('Error fetching call spare usage:', error);
    throw error;
  }
}

/**
 * Update call spare usage status (after return request is submitted)
 * @param {number} usageId - Call spare usage ID
 * @param {string} status - New status (USED, PARTIAL, NOT_USED, RETURNED)
 * @returns {boolean} Success indicator
 */
export async function updateCallSpareUsageStatus(usageId, status) {
  try {
    await sequelize.query(`
      UPDATE call_spare_usage
      SET usage_status = ?,
          updated_at = GETDATE()
      WHERE usage_id = ?
    `, {
      replacements: [status, usageId],
      type: QueryTypes.UPDATE
    });

    return true;
  } catch (error) {
    console.error('Error updating spare usage status:', error);
    throw error;
  }
}

export default {
  recordCallSpareUsage,
  getCallSpareUsage,
  updateCallSpareUsageStatus
};
