import express from "express";
const router = express.Router();
import { Op, QueryTypes } from 'sequelize';
import { sequelize, SparePart, ServiceCenterInventory, ProductModel, ProductMaster, ProductGroup, ServiceCentre, SpareRequest, SpareRequestItem, SAPDocuments, SAPDocumentItems } from '../models/index.js';
import { authenticateToken, optionalAuthenticate } from '../middleware/auth.js';

// GET /api/returns/service-centers/:id/inventory/groups - Get distinct product groups in service center inventory
router.get('/service-centers/:id/inventory/groups', optionalAuthenticate, async (req, res) => {
  try {
    const scId = req.params.id;
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
    res.json(results);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// GET /api/returns/service-centers/:id/inventory/products - Get distinct products in service center inventory for a group
router.get('/service-centers/:id/inventory/products', optionalAuthenticate, async (req, res) => {
  try {
    const scId = req.params.id;
    const { group } = req.query;
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
    res.json(results);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/returns/service-centers/:id/inventory/models - Get distinct models in service center inventory for a product
router.get('/service-centers/:id/inventory/models', optionalAuthenticate, async (req, res) => {
  try {
    const scId = req.params.id;
    const { product } = req.query;
    const [results] = await sequelize.query(`
      SELECT DISTINCT pm.MODEL_CODE as modelName
      FROM ${ServiceCenterInventory.getTableName()} sci
      JOIN ${SparePart.getTableName()} sp ON sci.Sku = sp.PART
      JOIN ${ProductModel.getTableName()} pm ON sp.ModelID = pm.Id
      JOIN ${ProductMaster.getTableName()} pm2 ON pm.Product = pm2.ID
      WHERE sci.ServiceCenterId = ? AND pm2.VALUE = ? AND (sci.GoodQty > 0 OR sci.DefectiveQty > 0)
      ORDER BY pm.MODEL_CODE
    `, { replacements: [scId, product] });
    res.json(results);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// GET /api/returns/service-centers/:id/inventory/spares - Get distinct spares in service center inventory for a model
router.get('/service-centers/:id/inventory/spares', optionalAuthenticate, async (req, res) => {
  try {
    const scId = req.params.id;
    const { model } = req.query;
    const [results] = await sequelize.query(`
      SELECT DISTINCT sp.DESCRIPTION as spareName
      FROM ${ServiceCenterInventory.getTableName()} sci
      JOIN ${SparePart.getTableName()} sp ON sci.Sku = sp.PART
      JOIN ${ProductModel.getTableName()} pm ON sp.ModelID = pm.Id
      WHERE sci.ServiceCenterId = ? AND pm.MODEL_CODE = ? AND (sci.GoodQty > 0 OR sci.DefectiveQty > 0)
      ORDER BY sp.DESCRIPTION
    `, { replacements: [scId, model] });
    res.json(results);
  } catch (error) {
    console.error('Error fetching spares:', error);
    res.status(500).json({ error: 'Failed to fetch spares' });
  }
});

// GET /api/returns/service-centers/:id/inventory - Get service center inventory filtered
router.get('/service-centers/:id/inventory', optionalAuthenticate, async (req, res) => {
  try {
    const scId = req.params.id;
    const { group, product, model, spare } = req.query;

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
    res.json(results);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// POST /api/returns - Submit spare return request with FIFO invoice matching
router.post('/', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { returnType, items } = req.body;
    const userId = req.user.id;
    const centerId = req.user.centerId;

    if (!centerId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'User not associated with a service center' });
    }

    // Get the service centre to find the assigned branch
    const serviceCentre = await ServiceCentre.findByPk(centerId, { transaction });
    if (!serviceCentre || !serviceCentre.BranchId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Service center not found or not assigned to a branch' });
    }
    const branchId = serviceCentre.BranchId;
    const asc_id = centerId; // ASC ID is the service center ID

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

    // Generate return document number
    const returnDate = new Date();
    const returnDateStr = `${returnDate.getFullYear()}${String(returnDate.getMonth() + 1).padStart(2, '0')}${String(returnDate.getDate()).padStart(2, '0')}`;
    const returnRandom = Math.random().toString(36).substring(2, 8).toUpperCase();
    const returnDocNumber = `RET-${returnDateStr}-${returnRandom}`;

    console.log(`[RETURN] Processing return request: ${returnDocNumber}`);
    console.log(`[RETURN] Service Center: ${centerId}, Branch: ${branchId}`);
    console.log(`[RETURN] Return Type: ${returnType}`);

    // Process each returned item
    for (const item of items) {
      // Validate quantities based on return type
      const inventory = await ServiceCenterInventory.findOne({
        where: { ServiceCenterId: centerId, Sku: item.sku },
        transaction
      });
      if (!inventory) {
        await transaction.rollback();
        return res.status(400).json({ error: `Inventory not found for ${item.spareName}` });
      }

      let availableQty;
      if (returnType && returnType.toLowerCase() === 'defective') {
        availableQty = inventory.DefectiveQty || 0;
      } else {
        availableQty = inventory.GoodQty || 0;
      }

      if (item.returnQty <= 0 || item.returnQty > availableQty) {
        await transaction.rollback();
        return res.status(400).json({ error: `Invalid return quantity for ${item.spareName}. Available: ${availableQty}` });
      }

      // ===== FIFO INVOICE MATCHING =====
      console.log(`[FIFO] Finding invoice for spare: ${item.sku}, qty: ${item.returnQty}`);
      
      // Get spare part details (unit_price, hsn)
      const sparePart = await SparePart.findOne({
        where: { PART: item.sku },
        raw: true,
        transaction
      });

      // Find the EARLIEST (FIFO) SAP invoice for this spare that was sent to this ASC
      // We look for the oldest SAPDocumentItems entry for this spare at this ASC
      const fifInvoice = await sequelize.query(`
        SELECT TOP 1 
          sd.id as sap_doc_id,
          sd.sap_doc_number,
          sd.created_at,
          sdi.id as sap_item_id,
          sdi.spare_part_id,
          sdi.qty as invoice_qty,
          sdi.unit_price,
          sdi.gst,
          sdi.hsn
        FROM sap_documents sd
        INNER JOIN sap_document_items sdi ON sd.id = sdi.sap_doc_id
        WHERE sd.asc_id = ?
          AND sd.sap_doc_type = 'INVOICE'
          AND sdi.spare_part_id = ?
        ORDER BY sd.created_at ASC
      `, {
        replacements: [asc_id, sparePart?.Id || item.sku],
        type: QueryTypes.SELECT,
        transaction
      });

      let invoiceData = null;
      if (fifInvoice && fifInvoice.length > 0) {
        invoiceData = fifInvoice[0];
        console.log(`✅ FIFO Invoice found: ${invoiceData.sap_doc_number}`);
        console.log(`   Created: ${invoiceData.created_at}`);
        console.log(`   Unit Price: ${invoiceData.unit_price}, HSN: ${invoiceData.hsn}, GST: ${invoiceData.gst}`);
      } else {
        console.warn(`⚠️  No invoice found for spare ${item.sku} at ASC ${asc_id}`);
        // Use spare part master data as fallback
        invoiceData = {
          sap_doc_number: 'MANUAL_RETURN',
          unit_price: sparePart?.unit_price || 0,
          hsn: sparePart?.hsn_code || null,
          gst: sparePart?.gst_rate || 0
        };
      }

      // Create spare request item with invoice details
      const srItem = await SpareRequestItem.create({
        RequestId: spareRequest.Id,
        Sku: item.sku,
        SpareName: item.spareName || item.sku || 'Unknown Spare',
        RequestedQty: item.returnQty,
        // Invoice details for return reference
        invoice_number: invoiceData.sap_doc_number,
        invoice_unit_price: invoiceData.unit_price,
        invoice_hsn: invoiceData.hsn,
        invoice_gst: invoiceData.gst,
        return_document_number: returnDocNumber,
        return_type: returnType || 'Return',
        CreatedAt: new Date(),
        UpdatedAt: new Date()
      }, { transaction });

      console.log(`✅ Return item created: ${item.sku}, Qty: ${item.returnQty}, Invoice: ${invoiceData.sap_doc_number}`);

      // Deduct from service center inventory based on return type
      if (returnType && returnType.toLowerCase() === 'defective') {
        inventory.DefectiveQty -= item.returnQty;
      } else {
        inventory.GoodQty -= item.returnQty;
      }
      await inventory.save({ transaction });
    }

    await transaction.commit();
    console.log(`✅ Return request submitted: ${returnDocNumber}`);
    
    res.json({ 
      success: true, 
      message: 'Return request submitted successfully', 
      requestId: spareRequest.Id,
      returnDocNumber: returnDocNumber
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error submitting return request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/groups', authenticateToken, async (req, res) => {
  try {
    const groups = await sequelize.query(`
      SELECT DISTINCT g.GroupCode as GroupCode, g.GroupName as GroupName
      FROM ${ProductGroup.getTableName()} g
      INNER JOIN ${ProductModel.getTableName()} pm ON g.GroupCode = pm.GroupCode
      INNER JOIN ${SparePart.getTableName()} sp ON pm.Id = sp.ModelID
      INNER JOIN ${ServiceCenterInventory.getTableName()} sci ON sp.Sku = sci.Sku
      WHERE sci.ServiceCenterId = ? AND (COALESCE(sci.GoodQty, 0) + COALESCE(sci.DefectiveQty, 0) > 0)
    `, {
      replacements: [req.user.centerId],
      type: sequelize.QueryTypes.SELECT
    });
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/products', authenticateToken, async (req, res) => {
  const { groupCode } = req.query;
  if (!groupCode) {
    return res.status(400).json({ error: 'groupCode is required' });
  }
  try {
    const products = await sequelize.query(`
      SELECT DISTINCT pm.ProductName as productName
      FROM products_master pm
      INNER JOIN product_models pm2 ON pm.Id = pm2.ProductID
      INNER JOIN spare_parts sp ON pm2.Id = sp.ModelID
      INNER JOIN service_center_inventories sci ON sp.Sku = sci.Sku
      WHERE pm2.GroupCode = ? AND sci.ServiceCenterId = ? AND (COALESCE(sci.GoodQty, 0) + COALESCE(sci.DefectiveQty, 0) > 0)
    `, {
      replacements: [groupCode, req.user.centerId],
      type: sequelize.QueryTypes.SELECT
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/models', authenticateToken, async (req, res) => {
  const { productCode, groupCode } = req.query;
  if (!productCode || !groupCode) {
    return res.status(400).json({ error: 'productCode and groupCode are required' });
  }
  try {
    const models = await sequelize.query(`
      SELECT DISTINCT pm.Id as modelId, pm.ModelDescription as modelName
      FROM product_models pm
      INNER JOIN spare_parts sp ON pm.Id = sp.ModelID
      INNER JOIN service_center_inventories sci ON sp.Sku = sci.Sku
      WHERE pm.ProductID = (SELECT Id FROM products_master WHERE ProductName = ?) AND pm.GroupCode = ? AND sci.ServiceCenterId = ? AND (COALESCE(sci.GoodQty, 0) + COALESCE(sci.DefectiveQty, 0) > 0)
    `, {
      replacements: [productCode, groupCode, req.user.centerId],
      type: sequelize.QueryTypes.SELECT
    });
    res.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/spare-parts', authenticateToken, async (req, res) => {
  const { modelId } = req.query;
  if (!modelId) {
    return res.status(400).json({ error: 'modelId is required' });
  }
  try {
    const spareParts = await sequelize.query(`
      SELECT DISTINCT sci.Sku as sku, sp.DESCRIPTION as spareName
      FROM ${SparePart.getTableName()} sp
      INNER JOIN ${ServiceCenterInventory.getTableName()} sci ON sp.PART = sci.Sku
      WHERE sp.ModelID = ? AND sci.ServiceCenterId = ? AND (COALESCE(sci.GoodQty, 0) + COALESCE(sci.DefectiveQty, 0) > 0)
    `, {
      replacements: [Number(modelId), req.user.centerId],
      type: sequelize.QueryTypes.SELECT
    });
    res.json(spareParts);
  } catch (error) {
    console.error('Error fetching spare parts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/inventory', authenticateToken, async (req, res) => {
  const { modelId } = req.query;
  if (!modelId) {
    return res.status(400).json({ error: 'modelId is required' });
  }
  try {
    const inventory = await sequelize.query(`
      SELECT sci.Sku as sku, sp.DESCRIPTION as spareName, (COALESCE(sci.GoodQty, 0) + COALESCE(sci.DefectiveQty, 0)) as remainingQty
      FROM ${ServiceCenterInventory.getTableName()} sci
      INNER JOIN ${SparePart.getTableName()} sp ON sci.Sku = sp.PART
      WHERE sp.ModelID = ? AND sci.ServiceCenterId = ? AND (COALESCE(sci.GoodQty, 0) + COALESCE(sci.DefectiveQty, 0) > 0)
    `, {
      replacements: [Number(modelId), req.user.centerId],
      type: sequelize.QueryTypes.SELECT
    });
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/returns/branch-requests - Get return requests for the branch
router.get('/branch-requests', authenticateToken, async (req, res) => {
  try {
    // Assuming branch users have branchId in token or derive from user
    // For now, assume req.user.branchId exists; adjust as needed
    const branchId = req.user.branchId; 
    if (!branchId) {
      return res.status(400).json({ error: 'User not associated with a branch' });
    }
  // Need to set this in auth middleware for branch users

    const requests = await sequelize.query(`
      SELECT sr.Id as id, sr.RequestNumber as requestId, sr.CreatedAt as createdAt, sr.Status
      FROM SpareRequests sr
      WHERE sr.BranchId = ? AND (sr.RequestType = 'return' OR sr.Status = 'Return Requested')
      ORDER BY sr.CreatedAt DESC
    `, {
      replacements: [branchId],
      type: sequelize.QueryTypes.SELECT
    });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching branch requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/returns/branch-requests/:id/details - Get details of a specific return request
router.get('/branch-requests/:id/details', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user.branchId;

    const request = await SpareRequest.findOne({
      where: { Id: id, BranchId: branchId, [Op.or]: [{ RequestType: 'return' }, { Status: 'Return Requested' }] }
    });
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Get the items
    const items = await SpareRequestItem.findAll({
      where: { RequestId: id },
      // Only select columns that exist in the model to avoid DB errors
      attributes: ['Sku', 'SpareName', 'RequestedQty', 'ApprovedQty']
    });

    // Calculate total qty
    const totalQty = items.reduce((sum, item) => sum + item.RequestedQty, 0);

    res.json({
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
    });
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/returns/branch-requests/:id/items - Update approved, rejected and received qtys for items
router.put('/branch-requests/:id/items', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { items } = req.body; // array of { sku, receivedQty, approvedQty, rejectedQty }
  const branchId = req.user.branchId;

  const transaction = await sequelize.transaction();
  try {
    // Verify the request belongs to the branch
    const request = await SpareRequest.findOne({
      where: { Id: id, BranchId: branchId },
      transaction
    });
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    let hasApprovals = false;
    let hasRejections = false;
    const currentDate = new Date();

    for (const item of items) {
      // Get the item to validate quantities
      const spareItem = await SpareRequestItem.findOne({
        where: { RequestId: id, Sku: item.sku },
        transaction
      });
      
      if (!spareItem) {
        await transaction.rollback();
        return res.status(400).json({ error: `Item ${item.sku} not found in request` });
      }
      
      // Get requested qty (DCF qty)
      const requestedQty = spareItem.RequestedQty || 0;
      const receivedQty = item.receivedQty || 0;
      const approvedQty = item.approvedQty || 0;
      const rejectedQty = item.rejectedQty || 0;
      
      // Validate: Received qty should not exceed requested qty
      if (receivedQty > requestedQty) {
        await transaction.rollback();
        return res.status(400).json({ error: `C&F Received QTY for ${item.sku} cannot exceed QTY DCF (${requestedQty})` });
      }
      
      // Validate: Approved qty should not exceed received qty
      if (approvedQty > receivedQty) {
        await transaction.rollback();
        return res.status(400).json({ error: `C&F Approved QTY for ${item.sku} cannot exceed Received QTY (${receivedQty})` });
      }
      
      // Track if there are approvals or rejections
      if (approvedQty > 0) {
        hasApprovals = true;
      }
      if (rejectedQty > 0) {
        hasRejections = true;
      }
      
      const [updated] = await SpareRequestItem.update(
        { ReceivedQty: receivedQty, ApprovedQty: approvedQty, RejectedQty: rejectedQty },
        { where: { RequestId: id, Sku: item.sku }, transaction }
      );
    }

    // Update the SpareRequest with C&F approval/rejection date (optional - if columns exist)
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
        // Log but don't fail if date columns don't exist yet
        console.warn('Could not update approval/rejection dates (columns may not exist yet):', dateUpdateError.message);
      }
    }

    await transaction.commit();
    res.json({ message: 'Items updated successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating items:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/returns/service-center-requests - Get return requests for the service center
router.get('/service-center-requests', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId;
    if (!serviceCenterId) {
      return res.status(400).json({ error: 'User not associated with a service center' });
    }

    const requests = await sequelize.query(`
      SELECT sr.Id as id, sr.RequestNumber as requestId, sr.CreatedAt as createdAt, sr.Status
      FROM SpareRequests sr
      WHERE sr.ServiceCenterId = ? AND (sr.RequestType = 'Return' OR sr.Status = 'Return Requested')
      ORDER BY sr.CreatedAt DESC
    `, {
      replacements: [serviceCenterId],
      type: sequelize.QueryTypes.SELECT
    });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching service center return requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/returns/service-center-requests/:id/details - Get details of a specific return request
router.get('/service-center-requests/:id/details', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const serviceCenterId = req.user.centerId;

    // Try to get request with CN columns, fallback if they don't exist
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
      // Fallback if CN columns don't exist yet
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
        // Final fallback
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
      return res.status(404).json({ error: 'Request not found' });
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

    res.json({
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
    });
      
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/returns/technician-spare-returns - Get technician spare return requests for rental return page
 * Service center endpoint to view spare returns submitted by technicians
 */
router.get('/technician-spare-returns/list', optionalAuthenticate, async (req, res) => {
  try {
    const { serviceCenterId, status = 'Approved' } = req.query;

    if (!serviceCenterId) {
      return res.status(400).json({ error: 'Service Center ID is required' });
    }

    console.log(`📋 Fetching technician spare returns for SC ${serviceCenterId} (status: ${status})`);

    // Fetch technician spare return requests for this service center from spare_requests table
    const spareReturns = await sequelize.query(`
      SELECT 
        sr.request_id as return_id,
        sr.request_number as return_number,
        sr.call_id,
        sr.requested_source_id as technician_id,
        sr.requested_to_id as service_center_id,
        s.status_name as return_status,
        sr.created_at as return_date,
        sr.updated_at as received_date,
        sr.verified_at as verified_date,
        sr.remarks,
        sr.created_at,
        t.name as technician_name,
        t.MOBILE_NO as technician_phone,
        (SELECT COUNT(*) FROM spare_request_items 
         WHERE request_id = sr.request_id) as defective_count,
        (SELECT COUNT(*) FROM spare_request_items 
         WHERE request_id = sr.request_id) as unused_count,
        (SELECT SUM(qty_requested) FROM spare_request_items 
         WHERE request_id = sr.request_id) as defective_qty,
        (SELECT SUM(qty_good) FROM spare_request_items 
         WHERE request_id = sr.request_id) as unused_qty
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id AND sr.requested_source_type = 'technician'
      LEFT JOIN status s ON sr.status_id = s.status_id
      WHERE sr.requested_to_id = ?
        AND sr.requested_to_type = 'service_center'
        AND s.status_name = ?
      ORDER BY sr.created_at DESC
    `, { 
      replacements: [serviceCenterId, status],
      type: QueryTypes.SELECT 
    });

    console.log(`✅ Found ${spareReturns.length} technician spare returns`);

    res.json({
      success: true,
      serviceCenterId,
      status,
      data: spareReturns,
      count: spareReturns.length
    });

  } catch (error) {
    console.error('Error fetching technician spare returns:', error);
    res.status(500).json({ 
      error: 'Failed to fetch technician spare returns',
      details: error.message
    });
  }
});

/**
 * GET /api/returns/technician-spare-returns/:returnId/items - Get items for a technician spare return
 */
router.get('/technician-spare-returns/:returnId/items', optionalAuthenticate, async (req, res) => {
  try {
    const { returnId } = req.params;

    console.log(`📦 Fetching items for spare return #${returnId}`);

    const items = await sequelize.query(`
      SELECT 
        sri.request_item_id as return_item_id,
        sri.request_id as return_id,
        sri.spare_id,
        'good' as item_type,
        sri.qty_requested as requested_qty,
        sri.qty_received as received_qty,
        sri.qty_good as verified_qty,
        '' as defect_reason,
        '' as condition_on_receipt,
        sri.remarks,
        sp.PART as spare_code,
        sp.DESCRIPTION as spare_name,
        sp.BRAND as spare_brand
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      WHERE sri.request_id = ?
      ORDER BY sri.request_item_id
    `, { 
      replacements: [returnId],
      type: QueryTypes.SELECT 
    });

    console.log(`✅ Found ${items.length} items`);

    res.json({
      success: true,
      returnId,
      data: items,
      count: items.length
    });

  } catch (error) {
    console.error('Error fetching return items:', error);
    res.status(500).json({ 
      error: 'Failed to fetch return items',
      details: error.message
    });
  }
});

export default router;