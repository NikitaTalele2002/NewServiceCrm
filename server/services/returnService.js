import { sequelize, SparePart, ProductModel, ProductMaster, ProductGroup, SpareRequest, SpareRequestItem } from '../models/index.js';
import { Op } from 'sequelize';

// Get distinct product groups in service center inventory
export async function getInventoryGroups(scId) {
  try {
    const ServiceCenterInventory = sequelize.models.ServiceCenterInventory;
    const [results] = await sequelize.query(`
      SELECT DISTINCT g.VALUE as groupCode, g.DESCRIPTION as groupName
      FROM ${ServiceCenterInventory.getTableName()} sci
      JOIN ${SparePart.getTableName()} sp ON sci.Sku = sp.PART
      JOIN ${ProductModel.getTableName()} pm ON sp.ModelID = pm.Id
      JOIN ${ProductMaster.getTableName()} pm2 ON pm.Product = pm2.ID
      JOIN ${ProductGroup.getTableName()} g ON pm2.Product_group_ID = g.Id
      WHERE sci.ServiceCenterId = ? AND (sci.GoodQty > 0 OR sci.DefectiveQty > 0)
      ORDER BY g.DESCRIPTION
    `, { replacements: [scId] });
    return results;
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw error;
  }
}

// Get distinct products in service center inventory for a group
export async function getInventoryProducts(scId, group) {
  try {
    const [results] = await sequelize.query(`
      SELECT DISTINCT pm2.VALUE as productName
      FROM ${ServiceCenterInventory.getTableName()} sci
      JOIN ${SparePart.getTableName()} sp ON sci.Sku = sp.PART
      JOIN ${ProductModel.getTableName()} pm ON sp.ModelID = pm.Id
      JOIN ${ProductMaster.getTableName()} pm2 ON pm.Product = pm2.ID
      JOIN ${ProductGroup.getTableName()} g ON pm2.Product_group_ID = g.Id
      WHERE sci.ServiceCenterId = ? AND g.VALUE = ? AND (sci.GoodQty > 0 OR sci.DefectiveQty > 0)
      ORDER BY pm2.VALUE
    `, { replacements: [scId, group] });
    return results;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

// Get distinct models in service center inventory for a product
export async function getInventoryModels(scId, product) {
  try {
    const [results] = await sequelize.query(`
      SELECT DISTINCT pm.MODEL_CODE as modelName
      FROM ${ServiceCenterInventory.getTableName()} sci
      JOIN ${SparePart.getTableName()} sp ON sci.Sku = sp.PART
      JOIN ${ProductModel.getTableName()} pm ON sp.ModelID = pm.Id
      JOIN ${ProductMaster.getTableName()} pm2 ON pm.Product = pm2.ID
      WHERE sci.ServiceCenterId = ? AND pm2.VALUE = ? AND (sci.GoodQty > 0 OR sci.DefectiveQty > 0)
      ORDER BY pm.MODEL_CODE
    `, { replacements: [scId, product] });
    return results;
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
}

// Get distinct spares in service center inventory for a model
export async function getInventorySpares(scId, model) {
  try {
    const [results] = await sequelize.query(`
      SELECT DISTINCT sp.DESCRIPTION as spareName
      FROM ${ServiceCenterInventory.getTableName()} sci
      JOIN ${SparePart.getTableName()} sp ON sci.Sku = sp.PART
      JOIN ${ProductModel.getTableName()} pm ON sp.ModelID = pm.Id
      WHERE sci.ServiceCenterId = ? AND pm.MODEL_CODE = ? AND (sci.GoodQty > 0 OR sci.DefectiveQty > 0)
      ORDER BY sp.DESCRIPTION
    `, { replacements: [scId, model] });
    return results;
  } catch (error) {
    console.error('Error fetching spares:', error);
    throw error;
  }
}

// Get service center inventory filtered
export async function getServiceCenterInventory(scId, group, product, model, spare) {
  try {
    let whereClause = 'sci.ServiceCenterId = ? AND (COALESCE(sci.GoodQty, 0) + COALESCE(sci.DefectiveQty, 0) > 0)';
    let replacements = [scId];

    if (group) {
      whereClause += ' AND g.VALUE = ?';
      replacements.push(group);
    }
    if (product) {
      whereClause += ' AND pm2.VALUE = ?';
      replacements.push(product);
    }
    if (model) {
      whereClause += ' AND pm.MODEL_CODE = ?';
      replacements.push(model);
    }
    if (spare) {
      whereClause += ' AND sp.DESCRIPTION = ?';
      replacements.push(spare);
    }

    const [results] = await sequelize.query(`
      SELECT sci.Sku as sku, sp.DESCRIPTION as spareName, (COALESCE(sci.GoodQty, 0) + COALESCE(sci.DefectiveQty, 0)) as remainingQty
      FROM ${ServiceCenterInventory.getTableName()} sci
      JOIN ${SparePart.getTableName()} sp ON sci.Sku = sp.PART
      JOIN ${ProductModel.getTableName()} pm ON sp.ModelID = pm.Id
      JOIN ${ProductMaster.getTableName()} pm2 ON pm.Product = pm2.ID
      JOIN ${ProductGroup.getTableName()} g ON pm2.Product_group_ID = g.Id
      WHERE ${whereClause}
      ORDER BY sp.DESCRIPTION
    `, { replacements });
    return results;
  } catch (error) {
    console.error('Error fetching inventory:', error);
    throw error;
  }
}

// Submit spare return request
export async function submitReturnRequest(returnType, items, userId, centerId) {
  const transaction = await sequelize.transaction();
  try {
    if (!centerId) {
      throw new Error('User not associated with a service center');
    }

    const serviceCentre = await ServiceCentre.findByPk(centerId, { transaction });
    if (!serviceCentre || !serviceCentre.BranchId) {
      throw new Error('Service center not found or not assigned to a branch');
    }
    const branchId = serviceCentre.BranchId;

    // Create the spare request
    const spareRequest = await SpareRequest.create({
      BranchId: branchId,
      ServiceCenterId: centerId,
      RequestNumber: `REQ-${Date.now()}`,
      Status: 'Return Requested',
      RequestType: 'return',
      CreatedAt: new Date(),
      UpdatedAt: new Date()
    }, { transaction });

    for (const item of items) {
      const inventory = await ServiceCenterInventory.findOne({
        where: { ServiceCenterId: centerId, Sku: item.sku },
        transaction
      });
      if (!inventory) {
        throw new Error(`Inventory not found for ${item.spareName}`);
      }

      let availableQty;
      if (returnType && returnType.toLowerCase() === 'defective') {
        availableQty = inventory.DefectiveQty || 0;
      } else {
        availableQty = inventory.GoodQty || 0;
      }

      if (item.returnQty <= 0 || item.returnQty > availableQty) {
        throw new Error(`Invalid return quantity for ${item.spareName}. Available: ${availableQty}`);
      }

      await SpareRequestItem.create({
        RequestId: spareRequest.Id,
        Sku: item.sku,
        SpareName: item.spareName || item.sku || 'Unknown Spare',
        RequestedQty: item.returnQty,
        CreatedAt: new Date(),
        UpdatedAt: new Date()
      }, { transaction });

      if (returnType && returnType.toLowerCase() === 'defective') {
        inventory.DefectiveQty -= item.returnQty;
      } else {
        inventory.GoodQty -= item.returnQty;
      }
      await inventory.save({ transaction });
    }

    await transaction.commit();
    return { id: spareRequest.Id };
  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting return request:', error);
    throw error;
  }
}

// Get branch return requests
export async function getBranchReturnRequests(branchId) {
  try {
    const requests = await sequelize.query(`
      SELECT sr.Id as id, sr.RequestNumber as requestId, sr.CreatedAt as createdAt, sr.Status
      FROM SpareRequests sr
      WHERE sr.BranchId = ? AND (sr.RequestType = 'return' OR sr.Status = 'Return Requested')
      ORDER BY sr.CreatedAt DESC
    `, {
      replacements: [branchId],
      type: sequelize.QueryTypes.SELECT
    });
    return requests;
  } catch (error) {
    console.error('Error fetching branch requests:', error);
    throw error;
  }
}

// Get branch return request details
export async function getBranchReturnRequestDetails(id, branchId) {
  try {
    const request = await SpareRequest.findOne({
      where: { Id: id, BranchId: branchId, [Op.or]: [{ RequestType: 'return' }, { Status: 'Return Requested' }] }
    });
    if (!request) {
      throw new Error('Request not found');
    }

    const items = await SpareRequestItem.findAll({
      where: { RequestId: id },
      attributes: ['Sku', 'SpareName', 'RequestedQty', 'ApprovedQty']
    });

    const totalQty = items.reduce((sum, item) => sum + item.RequestedQty, 0);

    return {
      requestNumber: request.RequestNumber,
      items: items.map(item => ({
        partCode: item.Sku,
        partDescription: item.SpareName,
        qtyDcf: item.RequestedQty,
        cfReceivedQty: item.ReceivedQty,
        cfApprovedQty: item.ApprovedQty,
        cfRejectedQty: item.RejectedQty
      })),
      totalQty
    };
  } catch (error) {
    console.error('Error fetching request details:', error);
    throw error;
  }
}

// Update return request items (received, approved, rejected qtys)
export async function updateReturnRequestItems(id, branchId, items) {
  const transaction = await sequelize.transaction();
  try {
    const request = await SpareRequest.findOne({
      where: { Id: id, BranchId: branchId },
      transaction
    });
    if (!request) {
      throw new Error('Request not found');
    }

    let hasApprovals = false;
    let hasRejections = false;
    const currentDate = new Date();

    for (const item of items) {
      const spareItem = await SpareRequestItem.findOne({
        where: { RequestId: id, Sku: item.sku },
        transaction
      });
      
      if (!spareItem) {
        throw new Error(`Item ${item.sku} not found in request`);
      }
      
      const requestedQty = spareItem.RequestedQty || 0;
      const receivedQty = item.receivedQty || 0;
      const approvedQty = item.approvedQty || 0;
      const rejectedQty = item.rejectedQty || 0;
      
      if (receivedQty > requestedQty) {
        throw new Error(`C&F Received QTY for ${item.sku} cannot exceed QTY DCF (${requestedQty})`);
      }
      
      if (approvedQty > receivedQty) {
        throw new Error(`C&F Approved QTY for ${item.sku} cannot exceed Received QTY (${receivedQty})`);
      }
      
      if (approvedQty > 0) {
        hasApprovals = true;
      }
      if (rejectedQty > 0) {
        hasRejections = true;
      }
      
      await SpareRequestItem.update(
        { ReceivedQty: receivedQty, ApprovedQty: approvedQty, RejectedQty: rejectedQty },
        { where: { RequestId: id, Sku: item.sku }, transaction }
      );
    }

    if (hasApprovals || hasRejections) {
      try {
        const updateData = {};
        if (hasApprovals) {
          updateData.CfApprovalDate = currentDate;
        }
        if (hasRejections) {
          updateData.CfRejectionDate = currentDate;
        }
        
        await SpareRequest.update(updateData, {
          where: { Id: id },
          transaction
        });
      } catch (dateUpdateError) {
        console.warn('Could not update approval/rejection dates:', dateUpdateError.message);
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating items:', error);
    throw error;
  }
}

// Get service center return requests
export async function getServiceCenterReturnRequests(serviceCenterId) {
  try {
    const requests = await sequelize.query(`
      SELECT sr.Id as id, sr.RequestNumber as requestId, sr.CreatedAt as createdAt, sr.Status
      FROM SpareRequests sr
      WHERE sr.ServiceCenterId = ? AND (sr.RequestType = 'Return' OR sr.Status = 'Return Requested')
      ORDER BY sr.CreatedAt DESC
    `, {
      replacements: [serviceCenterId],
      type: sequelize.QueryTypes.SELECT
    });
    return requests;
  } catch (error) {
    console.error('Error fetching service center return requests:', error);
    throw error;
  }
}

// Get service center return request details
export async function getServiceCenterReturnRequestDetails(id, serviceCenterId) {
  try {
    let requestRows;
    try {
      requestRows = await sequelize.query(`
        SELECT sr.Id, sr.RequestNumber, sr.CreatedAt, sr.Status, sr.RequestType,
               ISNULL(sr.CfApprovalDate, NULL) as CfApprovalDate,
               ISNULL(sr.CnDate, NULL) as CnDate,
               ISNULL(sr.CnValue, NULL) as CnValue,
               ISNULL(sr.CnCount, NULL) as CnCount
        FROM SpareRequests sr
        WHERE sr.Id = ? AND sr.ServiceCenterId = ? AND (sr.RequestType = 'Return' OR sr.Status = 'Return Requested')
      `, {
        replacements: [id, serviceCenterId],
        type: sequelize.QueryTypes.SELECT,
        raw: true
      });
    } catch (err) {
      try {
        requestRows = await sequelize.query(`
          SELECT sr.Id, sr.RequestNumber, sr.CreatedAt, sr.Status, sr.RequestType,
                 ISNULL(sr.CfApprovalDate, NULL) as CfApprovalDate,
                 ISNULL(sr.CnDate, NULL) as CnDate,
                 ISNULL(sr.CnValue, NULL) as CnValue
          FROM SpareRequests sr
          WHERE sr.Id = ? AND sr.ServiceCenterId = ? AND (sr.RequestType = 'Return' OR sr.Status = 'Return Requested')
        `, {
          replacements: [id, serviceCenterId],
          type: sequelize.QueryTypes.SELECT,
          raw: true
        });
      } catch (err2) {
        requestRows = await sequelize.query(`
          SELECT sr.Id, sr.RequestNumber, sr.CreatedAt, sr.Status, sr.RequestType
          FROM SpareRequests sr
          WHERE sr.Id = ? AND sr.ServiceCenterId = ? AND (sr.RequestType = 'Return' OR sr.Status = 'Return Requested')
        `, {
          replacements: [id, serviceCenterId],
          type: sequelize.QueryTypes.SELECT,
          raw: true
        });
      }
    }

    if (!requestRows || requestRows.length === 0) {
      throw new Error('Request not found');
    }

    const request = requestRows[0];

    const items = await sequelize.query(`
      SELECT sri.Id, sri.Sku, sri.SpareName, sri.RequestedQty, sri.ReceivedQty, sri.ApprovedQty, sri.RejectedQty
      FROM SpareRequestItems sri
      WHERE sri.RequestId = ?
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });

    return {
      id: request.Id,
      requestId: request.RequestNumber,
      cfApprovalDate: request.CfApprovalDate || null,
      cnDate: request.CnDate || null,
      cnValue: request.CnValue || null,
      cnCount: request.CnCount || 0,
      items: items.map(item => ({
        id: item.Id,
        sku: item.Sku,
        spareName: item.SpareName,
        requestedQty: item.RequestedQty,
        cfReceivedQty: item.ReceivedQty,
        cfApprovedQty: item.ApprovedQty,
        cfRejectedQty: item.RejectedQty
      }))
    };
  } catch (error) {
    console.error('Error fetching request details:', error);
    throw error;
  }
}
