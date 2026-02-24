import { sequelize, SpareRequest, SpareRequestItem, Status, Approvals, SpareInventory } from '../models/index.js';

export async function getRsmSpareRequests(req, res) {
  try {
    const { rsmUserId } = req.params;
    if (!rsmUserId) return res.status(400).json({ ok: false, error: 'rsmUserId required' });

    // 1) Find all state_ids assigned to this RSM
    const stateRows = await sequelize.query(
      `SELECT DISTINCT sm.state_id AS state_id FROM rsm_state_mapping sm WHERE sm.rsm_user_id = ? AND sm.is_active = 1`,
      { replacements: [rsmUserId], type: sequelize.QueryTypes.SELECT }
    );
    const stateIds = stateRows.map(r => r.state_id).filter(Boolean);
    if (stateIds.length === 0) return res.json({ ok: true, requests: [] });

    // 2) Find all plant_ids in those states
    const plantRows = await sequelize.query(
      `SELECT DISTINCT p.plant_id AS plant_id FROM plants p WHERE p.state_id IN (${stateIds.map(() => '?').join(',')})`,
      { replacements: stateIds, type: sequelize.QueryTypes.SELECT }
    );
    const plantIds = plantRows.map(r => r.plant_id).filter(Boolean);
    if (plantIds.length === 0) return res.json({ ok: true, requests: [] });

    // Get pending status_id
    const pendingStatus = await Status.findOne({ where: { status_name: 'pending' } });
    const pendingStatusId = pendingStatus?.status_id || 1;

    // 3) Get all request IDs that have already been approved/rejected by any RSM (Level 1 approvals)
    const approvedRequestIds = await Approvals.findAll({
      where: {
        entity_type: 'spare_request',
        approval_level: 1
      },
      attributes: ['entity_id'],
      raw: true
    });
    const approvedIdSet = new Set(approvedRequestIds.map(a => a.entity_id));

    // 4) Fetch all PENDING requests where requested_to_type = 'plant' and requested_to_id in plantIds
    const allRequests = await SpareRequest.findAll({
      where: {
        requested_to_type: 'plant',
        requested_to_id: plantIds,
        status_id: pendingStatusId // Only show pending requests
      },
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
          required: false,
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 500,
    });

    // Filter out requests that have already been approved/rejected
    const newRequests = allRequests.filter(r => !approvedIdSet.has(r.request_id));

    // 4) Optionally, fetch legacy requests for ASCs in these states (if needed)
    let legacyRequests = [];
    // ...existing code for legacyRequests can be left as is or removed if not needed...

    // Fetch all unique spare_ids from all items
    const allSpareIds = Array.from(new Set(
      newRequests.flatMap(r => (r.SpareRequestItems || []).map(item => item.spare_id))
    ));
    let sparePartsMap = {};
    if (allSpareIds.length > 0) {
      const { SparePart } = await import('../models/index.js');
      const spareParts = await SparePart.findAll({ where: { Id: allSpareIds } });
      sparePartsMap = Object.fromEntries(
        spareParts.map(sp => [sp.Id, sp])
      );
    }

    // normalize newRequests with SKU, name, and AVAILABLE INVENTORY at the plant
    const formattedNew = await Promise.all(newRequests.map(async (r) => {
      // Fetch inventory at the plant for each item (plant is requested_to_type)
      const itemsWithInventory = await Promise.all(
        (r.SpareRequestItems || []).map(async (item) => {
          // Get available inventory at the plant location (requested_to)
          const plantInventory = await SpareInventory.findOne({
            where: {
              spare_id: item.spare_id,
              location_type: r.requested_to_type,
              location_id: r.requested_to_id
            }
          });
          
          const availableQty = plantInventory ? (plantInventory.qty_good || 0) : 0;
          
          return {
            id: item.id,
            sku: sparePartsMap[item.spare_id]?.PART || '',
            spareName: sparePartsMap[item.spare_id]?.DESCRIPTION || '',
            requestedQty: item.requested_qty,
            approvedQty: item.approved_qty,
            approval_status: item.approval_status,
            availableQty: availableQty  // ← Available inventory at plant
          };
        })
      );
      
      return {
        source: 'new',
        id: r.request_id,
        spare_request_type: r.spare_request_type,
        status_id: r.status_id,
        request_status: pendingStatus?.status_name || 'pending',
        requested_to_type: r.requested_to_type,
        requested_to_id: r.requested_to_id,
        requested_source_type: r.requested_source_type,
        requested_source_id: r.requested_source_id,
        created_at: r.created_at,
        items: itemsWithInventory
      };
    }));

    // attach items for legacy requests
    const legacyWithItems = await Promise.all(
      legacyRequests.map(async (reqRow) => {
        try {
          const items = await sequelize.query('SELECT * FROM SpareRequestItems WHERE RequestId = ?', {
            replacements: [reqRow.Id],
            type: sequelize.QueryTypes.SELECT,
          });
          reqRow.Items = items || [];
        } catch (e) {
          reqRow.Items = [];
        }
        return reqRow;
      })
    );

    const combined = {
      legacy: legacyWithItems,
      modern: formattedNew,
    };

    res.json({ ok: true, requests: combined });
  } catch (err) {
    console.error('Error in getRsmSpareRequests:', err && err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}

export default { getRsmSpareRequests };
