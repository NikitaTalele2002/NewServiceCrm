import { sequelize, SpareRequest, SpareRequestItem, Branch, ServiceCentre, Technician, BranchInventory } from '../models/index.js';

// Branch dashboard
export async function getBranchDashboard(branchId) {
  try {
    const pendingCount = await SpareRequest.count({ where: { BranchId: branchId, Status: 'pending' } });

    const [lowStockItems] = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM BranchInventory 
       WHERE BranchId = ? AND GoodQty <= MinimumStockLevel`,
      { replacements: [branchId], type: sequelize.QueryTypes.SELECT }
    );

    const inv = await BranchInventory.findAll({ where: { BranchId: branchId } });

    return {
      ok: true,
      kpis: {
        pendingRequests: pendingCount,
        lowStockItems: lowStockItems?.cnt || 0,
        totalInventoryItems: inv.length,
      },
    };
  } catch (err) {
    throw err;
  }
}

// List spare requests for branch
export async function listBranchRequests(branchId) {
  try {
    const requests = await sequelize.query(`
      SELECT sr.* FROM SpareRequests sr
      WHERE sr.BranchId = ?
      ORDER BY sr.CreatedAt DESC
    `, {
      replacements: [branchId],
      type: sequelize.QueryTypes.SELECT
    });

    const requestsWithItems = await Promise.all(
      requests.map(async (req) => {
        try {
          const items = await sequelize.query(
            'SELECT * FROM SpareRequestItems WHERE RequestId = ?',
            { replacements: [req.Id], type: sequelize.QueryTypes.SELECT }
          );
          req.Items = items;
        } catch (e) {
          console.warn(`Failed to fetch items for request ${req.Id}:`, e.message);
          req.Items = [];
        }

        try {
          const [branch] = await sequelize.query('SELECT BranchName FROM Branches WHERE Id = ?', {
            replacements: [req.BranchId],
            type: sequelize.QueryTypes.SELECT
          });
          req.Branch = branch || {};
        } catch (e) {
          req.Branch = {};
        }

        try {
          const [sc] = await sequelize.query('SELECT CenterName FROM ServiceCenters WHERE Id = ?', {
            replacements: [req.ServiceCenterId],
            type: sequelize.QueryTypes.SELECT
          });
          req.ServiceCentre = sc || {};
        } catch (e) {
          req.ServiceCentre = {};
        }

        return req;
      })
    );

    return { ok: true, requests: requestsWithItems };
  } catch (err) {
    throw err;
  }
}

// Get single request
export async function getBranchRequest(requestId) {
  try {
    const request = await SpareRequest.findOne({
      where: { Id: requestId },
      include: [{ model: SpareRequestItem, as: 'Items' }],
    });

    if (!request) throw new Error('Request not found');
    return { ok: true, request };
  } catch (err) {
    throw err;
  }
}

// Approve request
export async function approveBranchRequest(requestId, branchId, approvedQtys = {}) {
  const transaction = await sequelize.transaction();
  try {
    const request = await SpareRequest.findOne({
      where: { Id: requestId, BranchId: branchId },
      include: [{ model: SpareRequestItem, as: 'Items' }],
    });

    if (!request) throw new Error('Request not found');
    if (request.Status !== 'pending') throw new Error('Request is not pending');

    // Check if all items can be fully approved
    let canApprove = true;
    for (const item of request.Items) {
      const approvedQty = approvedQtys[item.Id] || item.RequestedQty;
      const inv = await BranchInventory.findOne({
        where: { BranchId: branchId, Sku: item.Sku },
      });
      item.dataValues.availableQty = inv ? inv.GoodQty : 0;
      if (!inv || inv.GoodQty < approvedQty) {
        canApprove = false;
        break;
      }
    }

    if (!canApprove) {
      await request.update({
        Status: 'forwarded',
        ForwardedAt: new Date(),
        ForwardedTo: 'depot',
        Notes: (request.Notes || '') + ' [Forwarded due to insufficient inventory]',
      });
      return { ok: true, message: 'Request forwarded to depot due to insufficient inventory' };
    }

    // Proceed to approve
    const branchName = 'branch_user';
    for (const item of request.Items) {
      const approvedQty = approvedQtys[item.Id] || item.RequestedQty;

      await item.update({ ApprovedQty: approvedQty });

      const inv = await BranchInventory.findOne({
        where: { BranchId: branchId, Sku: item.Sku },
      });

      if (inv) {
        const toTake = approvedQty;
        await inv.update({ GoodQty: inv.GoodQty - toTake });

        // Push approved items to ServiceCenterInventory
        if (toTake > 0 && request.ServiceCenterId) {
          const existing = await ServiceCenterInventory.findOne({
            where: { ServiceCenterId: request.ServiceCenterId, Sku: item.Sku },
          });

          if (existing) {
            await existing.update({
              GoodQty: existing.GoodQty + toTake,
              ReceivedAt: new Date(),
              ReceivedFrom: branchName,
              UpdatedAt: new Date(),
            });
          } else {
            await ServiceCenterInventory.create({
              ServiceCenterId: request.ServiceCenterId,
              Sku: item.Sku,
              SpareName: item.SpareName,
              GoodQty: toTake,
              DefectiveQty: 0,
              ReceivedFrom: branchName,
              ReceivedAt: new Date(),
              CreatedAt: new Date(),
              UpdatedAt: new Date(),
            });
          }
        }
      }
    }

    await request.update({
      Status: 'approved',
      ApprovedAt: new Date(),
      ApprovedBy: branchName || 'branch_user',
    });

    return { ok: true, request };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// Forward request to depot
export async function forwardBranchRequest(requestId, branchId, depotLocation) {
  try {
    const request = await SpareRequest.findOne({
      where: { Id: requestId, BranchId: branchId },
    });

    if (!request) throw new Error('Request not found');

    await request.update({
      Status: 'forwarded',
      ForwardedAt: new Date(),
      ForwardedTo: depotLocation || 'Roorkee Depot',
    });

    return { ok: true, request };
  } catch (err) {
    throw err;
  }
}

// Get branch inventory
export async function getBranchInventory(branchId) {
  try {
    const inventory = await BranchInventory.findAll({
      where: { BranchId: branchId },
      order: [['Sku', 'ASC']],
    });

    return { ok: true, inventory };
  } catch (err) {
    throw err;
  }
}

// Adjust stock
export async function adjustBranchStock(branchId, sku, deltaGood = 0, deltaDefective = 0, notes) {
  try {
    if (!sku) throw new Error('sku required');

    const item = await BranchInventory.findOne({
      where: { BranchId: branchId, Sku: sku },
    });

    if (!item) throw new Error('Item not found');

    await item.update({
      GoodQty: Math.max(0, item.GoodQty + Number(deltaGood)),
      DefectiveQty: Math.max(0, item.DefectiveQty + Number(deltaDefective)),
    });

    return { ok: true, item };
  } catch (err) {
    throw err;
  }
}

// Get MSL alerts
export async function getBranchMSLAlerts(branchId) {
  try {
    const alerts = await sequelize.query(
      `SELECT * FROM BranchInventory 
       WHERE BranchId = ? AND GoodQty <= MinimumStockLevel
       ORDER BY GoodQty ASC`,
      { replacements: [branchId], type: sequelize.QueryTypes.SELECT }
    );

    return { ok: true, alerts };
  } catch (err) {
    throw err;
  }
}

// Service center: Create spare request
export async function createSpareRequest(branchId, items, scId) {
  try {
    if (!branchId || !items || items.length === 0) {
      throw new Error('branchId and items required');
    }

    const requestNum = `REQ-${Date.now()}`;

    const request = await SpareRequest.create({
      BranchId: branchId,
      ServiceCenterId: scId,
      RequestNumber: requestNum,
      Status: 'pending',
    });

    const createdItems = [];
    for (const item of items) {
      try {
        const createdItem = await SpareRequestItem.create({
          RequestId: request.Id,
          Sku: item.sku,
          SpareName: item.spareName || item.name,
          RequestedQty: item.qty || item.quantity,
          ApprovedQty: 0,
        });
        createdItems.push(createdItem);
      } catch (itemErr) {
        console.error('Failed to create item:', itemErr.message);
      }
    }

    return { ok: true, request, itemsCreated: createdItems.length };
  } catch (err) {
    throw err;
  }
}

// Service center: Get SC inventory
export async function getServiceCenterInventory(scId) {
  try {
    const ServiceCenterInventory = sequelize.models.ServiceCenterInventory;

    if (!ServiceCenterInventory) {
      return { ok: true, inventory: [] };
    }

    try {
      const inventory = await ServiceCenterInventory.findAll({
        where: { ServiceCenterId: scId },
        order: [['Sku', 'ASC']],
      });
      return { ok: true, inventory };
    } catch (queryErr) {
      console.warn('SC inventory query failed:', queryErr.message);
      return { ok: true, inventory: [] };
    }
  } catch (err) {
    return { ok: true, inventory: [] };
  }
}

// Service center: Get SC requests
export async function getServiceCenterRequests(scId) {
  try {
    const requests = await sequelize.query(`
      SELECT sr.* FROM SpareRequests sr
      WHERE sr.ServiceCenterId = ?
      ORDER BY sr.CreatedAt DESC
    `, {
      replacements: [scId],
      type: sequelize.QueryTypes.SELECT
    });

    const requestsWithItems = await Promise.all(
      requests.map(async (req) => {
        try {
          const items = await sequelize.query(
            'SELECT * FROM SpareRequestItems WHERE RequestId = ?',
            { replacements: [req.Id], type: sequelize.QueryTypes.SELECT }
          );
          return { ...req, Items: items };
        } catch (e) {
          console.warn(`Failed to fetch items for request ${req.Id}:`, e.message);
          return { ...req, Items: [] };
        }
      })
    );

    return { ok: true, requests: requestsWithItems };
  } catch (err) {
    throw err;
  }
}

// Get list of branches
export async function getBranches() {
  try {
    const branches = await sequelize.query(`
      SELECT Id, BranchName FROM Branches WHERE Active = 1 ORDER BY BranchName
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    return branches;
  } catch (error) {
    throw error;
  }
}

// Get service centers by branch
export async function getServiceCentersByBranch(branchId) {
  try {
    const serviceCenters = await sequelize.query(`
      SELECT Id, CenterName FROM ServiceCenters WHERE BranchId = ? ORDER BY CenterName
    `, {
      replacements: [branchId],
      type: sequelize.QueryTypes.SELECT
    });
    return serviceCenters;
  } catch (error) {
    throw error;
  }
}

// Get branch return requests
export async function getBranchReturnRequests(branchId) {
  try {
    const requests = await sequelize.query(`
      SELECT sr.Id, sr.RequestNumber, sr.Status, sr.CreatedAt, b.BranchName as branchName, sc.CenterName as serviceCenterName
      FROM SpareRequests sr
      LEFT JOIN Branches b ON sr.BranchId = b.Id
      LEFT JOIN ServiceCenters sc ON sr.ServiceCenterId = sc.Id
      WHERE sr.BranchId = ? AND sr.Status = 'Return Requested'
      ORDER BY sr.CreatedAt DESC
    `, {
      replacements: [branchId],
      type: sequelize.QueryTypes.SELECT
    });

    for (const req of requests) {
      const items = await sequelize.query(`
        SELECT sri.Sku, sri.SpareName, sri.RequestedQty
        FROM SpareRequestItems sri
        WHERE sri.RequestId = ?
      `, {
        replacements: [req.Id],
        type: sequelize.QueryTypes.SELECT
      });
      req.Items = items;
    }

    return requests;
  } catch (error) {
    throw error;
  }
}

// Get branch return request details
export async function getBranchReturnRequestDetails(id, branchId) {
  try {
    const requestCheck = await sequelize.query(`
      SELECT sr.RequestNumber, sr.Id,
             ISNULL(sr.CfApprovalDate, NULL) as CfApprovalDate,
             ISNULL(sr.CfRejectionDate, NULL) as CfRejectionDate
      FROM SpareRequests sr 
      WHERE sr.Id = ? AND sr.BranchId = ?
    `, {
      replacements: [id, branchId],
      type: sequelize.QueryTypes.SELECT,
      raw: true
    }).catch(err => {
      return sequelize.query(`
        SELECT sr.RequestNumber, sr.Id FROM SpareRequests sr WHERE sr.Id = ? AND sr.BranchId = ?
      `, {
        replacements: [id, branchId],
        type: sequelize.QueryTypes.SELECT,
        raw: true
      });
    });

    if (requestCheck.length === 0) {
      throw new Error('Request not found');
    }
    const requestNumber = requestCheck[0].RequestNumber;
    const cfApprovalDate = requestCheck[0].CfApprovalDate || null;
    const cfRejectionDate = requestCheck[0].CfRejectionDate || null;

    const items = await sequelize.query(`
      SELECT sri.Sku, sri.SpareName, sri.RequestedQty, sri.ReceivedQty, sri.ApprovedQty, sri.RejectedQty
      FROM SpareRequestItems sri
      WHERE sri.RequestId = ?
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });

    const totalQty = items.reduce((sum, item) => sum + item.RequestedQty, 0);

    return {
      id: requestCheck[0].Id,
      requestNumber,
      cfApprovalDate,
      cfRejectionDate,
      items: items.map(item => ({
        partCode: item.Sku,
        partDescription: item.SpareName,
        qtyDcf: item.RequestedQty,
        cfReceivedQty: item.ReceivedQty,
        cfApprovedQty: item.ApprovedQty,
        cfRejectedQty: item.RejectedQty,
      })),
      totalQty
    };
  } catch (error) {
    throw error;
  }
}

// Update branch return request items
export async function updateBranchReturnRequestItems(id, branchId, items) {
  const transaction = await sequelize.transaction();
  try {
    const requestCheck = await sequelize.query(`
      SELECT 1 FROM SpareRequests WHERE Id = ? AND BranchId = ?
    `, {
      replacements: [id, branchId],
      type: sequelize.QueryTypes.SELECT,
      transaction
    });
    if (requestCheck.length === 0) {
      throw new Error('Request not found');
    }

    let hasApprovals = false;
    let hasRejections = false;
    const currentDate = new Date();

    for (const item of items) {
      const itemData = await sequelize.query(`
        SELECT Id, RequestedQty, ReceivedQty FROM SpareRequestItems WHERE RequestId = ? AND Sku = ?
      `, {
        replacements: [id, item.partCode || item.sku],
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      if (itemData.length === 0) {
        throw new Error(`Item ${item.partCode || item.sku} not found in request`);
      }

      const requestedQty = parseInt(itemData[0].RequestedQty) || 0;
      const receivedQty = parseInt(item.receivedQty) || 0;
      const approvedQty = parseInt(item.approvedQty) || 0;
      const rejectedQty = parseInt(item.rejectedQty) || 0;

      if (receivedQty > requestedQty) {
        throw new Error(`C&F Received QTY for ${item.partCode || item.sku} cannot exceed QTY DCF (${requestedQty})`);
      }

      if (approvedQty > receivedQty) {
        throw new Error(`C&F Approved QTY for ${item.partCode || item.sku} cannot exceed Received QTY (${receivedQty})`);
      }

      if (approvedQty > 0) {
        hasApprovals = true;
      }
      if (rejectedQty > 0) {
        hasRejections = true;
      }

      await sequelize.query(`
        UPDATE SpareRequestItems SET ReceivedQty = ?, ApprovedQty = ?, RejectedQty = ? WHERE RequestId = ? AND Sku = ?
      `, {
        replacements: [receivedQty, approvedQty, rejectedQty, id, item.partCode || item.sku],
        type: sequelize.QueryTypes.UPDATE,
        transaction
      });
    }

    if (hasApprovals || hasRejections) {
      try {
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
        await sequelize.query(`
          UPDATE SpareRequests SET CfApprovalDate = ? WHERE Id = ?
        `, {
          replacements: [formattedDate, id],
          type: sequelize.QueryTypes.UPDATE,
          transaction
        });
      } catch (dateUpdateError) {
        console.warn('Could not update approval/rejection date:', dateUpdateError.message);
      }
    }

    await transaction.commit();
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError.message);
    }
    throw error;
  }
}

// Update request status
export async function updateBranchRequestStatus(id, branchId, status) {
  try {
    const requestCheck = await sequelize.query(`
      SELECT 1 FROM SpareRequests WHERE Id = ? AND BranchId = ?
    `, {
      replacements: [id, branchId],
      type: sequelize.QueryTypes.SELECT
    });
    if (requestCheck.length === 0) {
      throw new Error('Request not found');
    }

    await sequelize.query(`
      UPDATE SpareRequests SET Status = ? WHERE Id = ?
    `, {
      replacements: [status, id],
      type: sequelize.QueryTypes.UPDATE
    });
  } catch (error) {
    throw error;
  }
}
