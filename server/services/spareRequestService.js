import { sequelize, SpareRequest, SpareRequestItem, ServiceCenterInventory, Technicians, ComplaintRegistration, ServiceCenter, BranchInventory, TechnicianInventory, SparePart, Product, Calls, Status, SubStatus } from '../models/index.js';

// List spare requests with filters
export async function listSpareRequests(userServiceCenterId, complaintId, type) {
  try {
    // Build WHERE clause dynamically
    let whereConditions = [];
    const replacements = [];

    if (complaintId) {
      whereConditions.push('sr.ComplaintId = ?');
      replacements.push(complaintId);
    } else if (type === 'return') {
      whereConditions.push('sr.ReturnType = ?');
      replacements.push('return');
    } else {
      whereConditions.push('sr.TechnicianId IS NOT NULL');
    }

    // Filter by user's service center if available
    if (userServiceCenterId) {
      whereConditions.push('sr.ServiceCenterId = ?');
      replacements.push(userServiceCenterId);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT sr.Id, sr.RequestNumber, sr.Status, sr.CreatedAt, sr.ComplaintId, sr.TechnicianId, t.TechnicianName
      FROM SpareRequests sr
      LEFT JOIN Technicians t ON sr.TechnicianId = t.Id
      ${whereClause}
      ORDER BY sr.CreatedAt DESC
      OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
    `;

    const requests = await sequelize.query(query, {
      replacements: replacements,
      type: sequelize.QueryTypes.SELECT
    });

    // Fetch items for each request in parallel
    const formatted = await Promise.all(requests.map(async (req) => {
      const items = await sequelize.query(
        'SELECT Id, Sku, SpareName, RequestedQty, ApprovedQty FROM SpareRequestItems WHERE RequestId = ?',
        {
          replacements: [req.Id],
          type: sequelize.QueryTypes.SELECT
        }
      );

      return {
        id: req.Id,
        requestId: req.RequestNumber,
        technicianName: req.TechnicianName || 'Branch Request',
        technicianId: req.TechnicianId,
        callId: req.ComplaintId,
        complaintId: req.ComplaintId,
        status: req.Status,
        createdAt: req.CreatedAt,
        items: items.map(item => ({
          id: item.Id,
          sku: item.Sku,
          spareName: item.SpareName,
          requestedQty: item.RequestedQty,
          approvedQty: item.ApprovedQty
        }))
      };
    }));

    return formatted;
  } catch (error) {
    console.error('Error fetching spare requests:', error);
    throw error;
  }
}

// Create a new spare request
export async function createSpareRequest(complaintId, technicianId, items, notes) {
  const transaction = await sequelize.transaction();
  try {
    let serviceCenterId = null;
    let branchId = null;

    if (technicianId) {
      const technician = await Technician.findByPk(technicianId, { transaction });
      if (technician) {
        serviceCenterId = technician.ServiceCenterId;
      }
    }

    // Generate request number
    const requestNumber = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const request = await SpareRequest.create({
      BranchId: branchId,
      ServiceCenterId: serviceCenterId,
      TechnicianId: technicianId,
      ComplaintId: complaintId,
      RequestNumber: requestNumber,
      Status: 'pending',
      RequestType: 'order',
      Notes: notes
    }, { transaction });

    // Create request items
    if (items && items.length > 0) {
      // Fetch spare names for each sku
      const skus = items.map(item => item.sku);
      const spares = await SparePart.findAll({
        where: { PART: skus },
        attributes: ['PART', 'DESCRIPTION'],
        transaction
      });
      const spareMap = {};
      spares.forEach(spare => {
        spareMap[spare.PART] = spare.DESCRIPTION;
      });

      const requestItems = items.map(item => ({
        RequestId: request.Id,
        Sku: item.sku,
        SpareName: spareMap[item.sku] || item.spareName || item.sku,
        RequestedQty: item.requestedQty
      }));
      await SpareRequestItem.bulkCreate(requestItems, { transaction });
    }

    // Update call status to "pending" with sub-status "pending for spares"
    if (complaintId) {
      try {
        // Get "pending" status
        const pendingStatus = await Status.findOne({
          where: sequelize.where(
            sequelize.fn('LOWER', sequelize.col('status_name')),
            sequelize.Op.eq,
            'pending'
          ),
          transaction
        });

        if (pendingStatus) {
          // Get "pending for spares" sub-status
          const pendingSpareSubStatus = await SubStatus.findOne({
            where: {
              status_id: pendingStatus.status_id,
              ...sequelize.where(
                sequelize.fn('LOWER', sequelize.col('sub_status_name')),
                sequelize.Op.eq,
                'pending for spares'
              )
            },
            transaction
          });

          // Update call with new status and sub-status
          await Calls.update(
            {
              status_id: pendingStatus.status_id,
              sub_status_id: pendingSpareSubStatus ? pendingSpareSubStatus.sub_status_id : null
            },
            {
              where: { call_id: complaintId },
              transaction
            }
          );

          console.log(`✅ Updated call ${complaintId} status to "pending" with sub-status "pending for spares"`);
        } else {
          console.warn(`⚠️ "pending" status not found for call ${complaintId}`);
        }
      } catch (statusErr) {
        console.warn(`⚠️ Error updating call status for spare request:`, statusErr.message);
        // Don't fail the spare request creation if status update fails
      }
    }

    await transaction.commit();
    return { id: request.Id, requestNumber: request.RequestNumber };
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating spare request:', error);
    throw error;
  }
}

// Get replacement history
export async function getReplacementHistory(startDate, endDate, callId, status, requestedBy, page = 1, limit = 10) {
  try {
    const offset = (page - 1) * limit;
    let whereClause = `WHERE sr.RequestType = 'replacement'`;
    const replacements = [];

    if (startDate && endDate) {
      whereClause += ` AND sr.CreatedAt BETWEEN ? AND ?`;
      replacements.push(new Date(startDate));
      replacements.push(new Date(endDate));
    }

    if (status) {
      whereClause += ` AND sr.Status = ?`;
      replacements.push(status);
    }

    if (callId) {
      whereClause += ` AND sr.Notes LIKE ?`;
      replacements.push(`%Call ID: ${callId}%`);
    }

    if (requestedBy) {
      whereClause += ` AND sr.Notes LIKE ?`;
      replacements.push(`%Requested By: ${requestedBy}%`);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM SpareRequests sr ${whereClause}`;
    const [countResult] = await sequelize.query(countQuery, {
      replacements: replacements,
      type: sequelize.QueryTypes.SELECT
    });
    const count = countResult?.total || 0;

    // Get paginated results
    const dataQuery = `
      SELECT sr.Id, sr.RequestNumber, sr.Status, sr.CreatedAt, sr.RequestType, sr.Notes, sr.ComplaintId
      FROM SpareRequests sr
      ${whereClause}
      ORDER BY sr.CreatedAt DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `;

    const rows = await sequelize.query(dataQuery, {
      replacements: [...replacements, parseInt(offset), parseInt(limit)],
      type: sequelize.QueryTypes.SELECT
    });

    const transformed = rows.map(r => {
      const notes = r.Notes || '';
      const callMatch = notes.match(/Call ID: ([^\.]+)/);
      const reqByMatch = notes.match(/Requested By: ([^\.]+)/);
      const serialMatch = notes.match(/Serial No: ([^\.]+)/);
      const reasonMatch = notes.match(/Replacement Reason: ([^\.]+)/);
      const rsmMatch = notes.match(/RSM: ([^\.]+)/);
      const hodMatch = notes.match(/HOD: ([^\.]+)/);

      return {
        id: r.Id,
        callId: callMatch ? callMatch[1] : (r.ComplaintId || ''),
        requestNumber: r.RequestNumber,
        status: r.Status,
        createdAt: r.CreatedAt,
        requestedBy: reqByMatch ? reqByMatch[1] : '',
        orderType: r.RequestType,
        spareStatus: r.Status,
        replacementStatus: r.Status,
        approvedByRSM: rsmMatch ? rsmMatch[1] : '',
        approvedByHOD: hodMatch ? hodMatch[1] : '',
        oldSerialNo: serialMatch ? serialMatch[1] : '',
        newSerialNo: '',
        customer: null,
        product: { serialNo: serialMatch ? serialMatch[1] : '' },
        replacement: { reason: reasonMatch ? reasonMatch[1] : '', items: [] }
      };
    });

    return {
      data: transformed,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('Error in replacement-history:', error);
    throw error;
  }
}

// Get request details
export async function getRequestDetails(requestId, userServiceCenterId) {
  try {
    const request = await SpareRequest.findByPk(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    // Check if user is authorized
    if (userServiceCenterId && request.ServiceCenterId !== userServiceCenterId) {
      throw new Error('Not authorized to view this request');
    }

    const items = await SpareRequestItem.findAll({
      where: { RequestId: request.Id }
    });

    const formatted = {
      id: request.Id,
      requestId: request.RequestNumber,
      technicianName: request.TechnicianId ? `Technician ${request.TechnicianId}` : 'Unknown',
      technicianId: request.TechnicianId,
      callId: request.ComplaintId,
      complaintId: request.ComplaintId,
      status: request.Status,
      createdAt: request.CreatedAt,
      items: items.map(item => ({
        id: item.Id,
        sku: item.Sku,
        partCode: item.Sku,
        description: item.SpareName,
        requestedQty: item.RequestedQty,
        approvedQty: item.ApprovedQty
      }))
    };

    return formatted;
  } catch (error) {
    console.error('Error fetching request details:', error);
    throw error;
  }
}

// Check if request items can be allocated
export async function canAllocateRequest(requestId, userServiceCenterId) {
  try {
    const request = await SpareRequest.findByPk(requestId, {
      include: [
        {
          model: SpareRequestItem,
          as: 'Items'
        }
      ]
    });

    if (!request) {
      throw new Error('Request not found');
    }

    if (userServiceCenterId && request.ServiceCenterId !== userServiceCenterId) {
      throw new Error('Not authorized to allocate this request');
    }

    let canAllocate = true;
    const itemStatuses = [];

    for (const item of request.Items || []) {
      const inventory = await ServiceCenterInventory.findOne({
        where: {
          Sku: item.Sku,
          ServiceCenterId: request.ServiceCenterId
        }
      });

      const available = inventory ? inventory.GoodQty : 0;
      const sufficient = available >= item.RequestedQty;

      itemStatuses.push({
        sku: item.Sku,
        requestedQty: item.RequestedQty,
        availableQty: available,
        sufficient
      });

      if (!sufficient) {
        canAllocate = false;
      }
    }

    return { canAllocate, itemStatuses };
  } catch (error) {
    console.error('Error checking allocation possibility:', error);
    throw error;
  }
}

// Allocate spares
export async function allocateSpares(requestId, allocations, userServiceCenterId) {
  const transaction = await sequelize.transaction();
  try {
    const request = await SpareRequest.findByPk(requestId, { transaction });
    if (!request) {
      throw new Error('Request not found');
    }

    if (userServiceCenterId && request.ServiceCenterId !== userServiceCenterId) {
      throw new Error('Not authorized to allocate this request');
    }

    // Check availability for each allocation
    for (const [itemId, qty] of Object.entries(allocations)) {
      const item = await SpareRequestItem.findByPk(itemId, { transaction });
      if (!item) continue;

      const inventory = await ServiceCenterInventory.findOne({
        where: {
          Sku: item.Sku,
          ServiceCenterId: request.ServiceCenterId
        },
        transaction
      });

      if (!inventory || inventory.GoodQty < qty) {
        throw new Error(`Insufficient stock for ${item.Sku}`);
      }

      // Update inventory
      inventory.GoodQty -= qty;

      if (inventory.GoodQty === 0 && inventory.DefectiveQty === 0) {
        await inventory.destroy({ transaction });
      } else {
        await inventory.save({ transaction });
      }

      // Update approved qty
      await item.update({
        ApprovedQty: qty
      }, { transaction });

      // Add to technician inventory
      let techInventory = await TechnicianInventory.findOne({
        where: {
          TechnicianId: request.TechnicianId,
          Sku: item.Sku
        },
        transaction
      });

      if (techInventory) {
        await techInventory.update({
          GoodQty: techInventory.GoodQty + qty
        }, { transaction });
      } else {
        await TechnicianInventory.create({
          TechnicianId: request.TechnicianId,
          Sku: item.Sku,
          SpareName: item.SpareName,
          GoodQty: qty
        }, { transaction });
      }
    }

    // Update request status
    await request.update({
      Status: 'Allocated'
    }, { transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error allocating spares:', error);
    throw error;
  }
}

// Order from branch
export async function orderFromBranch(requestId, cartItems) {
  const transaction = await sequelize.transaction();
  try {
    const request = await SpareRequest.findByPk(requestId, { transaction });
    if (!request) {
      throw new Error('Request not found');
    }

    const serviceCenter = await ServiceCenter.findByPk(request.ServiceCenterId, { transaction });
    if (!serviceCenter) {
      throw new Error('Service center not found');
    }

    const branchId = 1; // TODO: Get proper branch ID

    for (const item of cartItems) {
      const branchInventory = await BranchInventory.findOne({
        where: {
          BranchId: branchId,
          Sku: item.sku
        },
        transaction
      });

      if (!branchInventory || branchInventory.GoodQty < item.orderQty) {
        throw new Error(`Insufficient stock in branch for ${item.spareName}`);
      }

      // Deduct from branch inventory
      await branchInventory.update({
        GoodQty: branchInventory.GoodQty - item.orderQty
      }, { transaction });

      // Add to service center inventory
      let scInventory = await ServiceCenterInventory.findOne({
        where: {
          ServiceCenterId: request.ServiceCenterId,
          Sku: item.sku
        },
        transaction
      });

      if (scInventory) {
        await scInventory.update({
          GoodQty: scInventory.GoodQty + item.orderQty
        }, { transaction });
      } else {
        await ServiceCenterInventory.create({
          ServiceCenterId: request.ServiceCenterId,
          Sku: item.sku,
          SpareName: item.spareName,
          GoodQty: item.orderQty
        }, { transaction });
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error ordering from branch:', error);
    throw error;
  }
}

// Return parts from technician
export async function returnParts(requestId, returns) {
  const transaction = await sequelize.transaction();
  try {
    const request = await SpareRequest.findByPk(requestId, { transaction });
    if (!request) {
      throw new Error('Request not found');
    }

    for (const returnItem of returns) {
      const { sku, goodQty, defectiveQty } = returnItem;

      const techInventory = await TechnicianInventory.findOne({
        where: {
          TechnicianId: request.TechnicianId,
          Sku: sku
        },
        transaction
      });

      if (!techInventory || (techInventory.GoodQty < goodQty) || (techInventory.DefectiveQty < defectiveQty)) {
        throw new Error(`Insufficient technician inventory for ${sku}`);
      }

      // Update technician inventory
      await techInventory.update({
        GoodQty: techInventory.GoodQty - goodQty,
        DefectiveQty: techInventory.DefectiveQty - defectiveQty
      }, { transaction });

      // Add to service center inventory
      let scInventory = await ServiceCenterInventory.findOne({
        where: {
          ServiceCenterId: request.ServiceCenterId,
          Sku: sku
        },
        transaction
      });

      if (scInventory) {
        await scInventory.update({
          GoodQty: scInventory.GoodQty + goodQty,
          DefectiveQty: (scInventory.DefectiveQty || 0) + defectiveQty
        }, { transaction });
      } else {
        await ServiceCenterInventory.create({
          ServiceCenterId: request.ServiceCenterId,
          Sku: sku,
          SpareName: techInventory.SpareName,
          GoodQty: goodQty,
          DefectiveQty: defectiveQty
        }, { transaction });
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error returning parts:', error);
    throw error;
  }
}

// Get all technicians
export async function getAllTechnicians() {
  try {
    const technicians = await Technician.findAll({
      attributes: ['Id', 'TechnicianName']
    });
    return technicians.map(t => ({ id: t.Id, name: t.TechnicianName }));
  } catch (error) {
    console.error('Error fetching technicians:', error);
    throw error;
  }
}

// Check spare part availability
export async function checkSparePartAvailability(sku, serviceCenterId) {
  try {
    const inventory = await ServiceCenterInventory.findOne({
      where: {
        Sku: sku,
        ServiceCenterId: serviceCenterId
      }
    });

    return { available: inventory ? inventory.GoodQty : 0 };
  } catch (error) {
    console.error('Error checking spare part availability:', error);
    throw error;
  }
}

// Get technician inventory
export async function getTechnicianInventory(technicianId) {
  try {
    const inventory = await TechnicianInventory.findAll({
      where: { TechnicianId: technicianId },
      attributes: ['Id', 'Sku', 'SpareName', 'GoodQty', 'DefectiveQty']
    });
    return inventory.map(i => ({
      id: i.Id,
      sku: i.Sku,
      spareName: i.SpareName,
      goodQty: i.GoodQty,
      defectiveQty: i.DefectiveQty
    }));
  } catch (error) {
    console.error('Error fetching technician inventory:', error);
    throw error;
  }
}

// Create replacement request
export async function createReplacementRequest(callId, productGroup, product, model, serialNo, rsm, hod, technician, asc, requestedBy, spareOrderRequestNo, replacementReason, userBranchId, userCenterId) {
  const transaction = await sequelize.transaction();
  try {
    // Determine service center ID
    let serviceCenterId = userCenterId || null;
    if (!serviceCenterId && userBranchId) {
      const { ServiceCenter } = await import('../models/index.js');
      const serviceCenter = await ServiceCenter.findOne({
        where: { BranchId: userBranchId },
        transaction
      });
      if (serviceCenter) serviceCenterId = serviceCenter.Id;
    }

    // Generate request number
    let requestNumber = spareOrderRequestNo || `REP-${Date.now()}`;
    if (spareOrderRequestNo) {
      const existing = await SpareRequest.findOne({ where: { RequestNumber: spareOrderRequestNo }, transaction });
      if (existing) {
        requestNumber = `${spareOrderRequestNo}-${Date.now()}`;
      }
    }

    const ascId = (asc || '').toString().trim();
    const finalServiceCenterId = ascId !== '' && !isNaN(Number(ascId)) ? Number(ascId) : serviceCenterId;
    const finalBranchId = userBranchId || null;
    const finalTechnicianId = technician ? Number(technician) : null;

    const spareRequest = await SpareRequest.create({
      BranchId: finalBranchId,
      ServiceCenterId: finalServiceCenterId,
      TechnicianId: finalTechnicianId,
      RequestNumber: requestNumber,
      Status: 'Pending',
      RequestType: 'replacement',
      Notes: `Replacement Reason: ${replacementReason}. Call ID: ${callId}. Serial No: ${serialNo}. Requested By: ${requestedBy}. RSM: ${rsm}. HOD: ${hod}`,
      CreatedAt: new Date(),
      UpdatedAt: new Date()
    }, { transaction });

    await transaction.commit();
    return { id: spareRequest.Id, requestNumber: spareRequest.RequestNumber };
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating replacement request:', error);
    throw error;
  }
}

// Get rental returns
export async function getRentalReturns(fromDate, toDate, technicianId, inventoryType) {
  try {
    // Filter for requests where spares are being RETURNED FROM technicians
    // (requested_source_type = 'technician' and they're returning TO service_center/warehouse/branch)
    let whereClause = {
      requested_source_type: 'technician'
    };

    if (technicianId) {
      whereClause.requested_source_id = technicianId;
    }

    if (fromDate || toDate) {
      whereClause.created_at = {};
      if (fromDate) whereClause.created_at[sequelize.Sequelize.Op.gte] = new Date(fromDate);
      if (toDate) whereClause.created_at[sequelize.Sequelize.Op.lte] = new Date(toDate);
    }

    const requests = await SpareRequest.findAll({
      where: whereClause,
      include: [
        {
          model: Status,
          as: 'status',
          attributes: ['status_id', 'status_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const formatted = [];
    for (const request of requests) {
      // Get spare request items (the actual spares being returned)
      const requestItems = await SpareRequestItem.findAll({
        where: { request_id: request.request_id },
        include: [
          {
            model: SparePart,
            as: 'SparePart',
            attributes: ['Id', 'PART', 'DESCRIPTION']
          }
        ]
      });

      for (const item of requestItems) {
        formatted.push({
          request_id: request.request_id,
          call_id: request.call_id,
          technicianId: request.requested_source_id,
          technicianName: `Technician ${request.requested_source_id}`,
          requestedTo: `${request.requested_to_type} (ID: ${request.requested_to_id})`,
          status: request.status?.status_name || 'Unknown',
          spare_id: item.spare_id,
          part: item.SparePart?.PART || 'N/A',
          spareName: item.SparePart?.DESCRIPTION || 'Unknown',
          quantity: item.requested_qty || 0,
          reason: request.request_reason,
          createdAt: request.created_at
        });
      }
    }

    return formatted;
  } catch (error) {
    console.error('Error fetching rental returns:', error);
    throw error;
  }
}

// Return parts (bulk return with technician removal)
export async function bulkReturnParts(returns) {
  const transaction = await sequelize.transaction();
  try {
    for (const returnItem of returns) {
      const { sku, goodQty, defectiveQty, technicianId } = returnItem;

      const techInventory = await TechnicianInventory.findOne({
        where: { Sku: sku, TechnicianId: technicianId },
        transaction
      });

      if (!techInventory) {
        throw new Error(`Technician inventory not found for ${sku}`);
      }

      if (techInventory.GoodQty < goodQty || techInventory.DefectiveQty < defectiveQty) {
        throw new Error(`Insufficient technician inventory for ${sku}`);
      }

      techInventory.GoodQty -= goodQty;
      techInventory.DefectiveQty -= defectiveQty;

      if (techInventory.GoodQty === 0 && techInventory.DefectiveQty === 0) {
        await techInventory.destroy({ transaction });
      } else {
        await techInventory.save({ transaction });
      }

      const technician = await Technician.findOne({
        where: { Id: technicianId },
        include: [{ model: ServiceCenter }],
        transaction
      });

      if (technician && technician.ServiceCenter) {
        const scId = technician.ServiceCenter.Id;

        let scInventory = await ServiceCenterInventory.findOne({
          where: { Sku: sku, ServiceCenterId: scId },
          transaction
        });

        if (scInventory) {
          scInventory.GoodQty += goodQty;
          scInventory.DefectiveQty += defectiveQty;

          if (scInventory.GoodQty === 0 && scInventory.DefectiveQty === 0) {
            await scInventory.destroy({ transaction });
          } else {
            await scInventory.save({ transaction });
          }
        } else {
          if (goodQty > 0 || defectiveQty > 0) {
            await ServiceCenterInventory.create({
              Sku: sku,
              SpareName: techInventory.SpareName,
              GoodQty: goodQty,
              DefectiveQty: defectiveQty,
              ServiceCenterId: scId
            }, { transaction });
          }
        }
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Error returning parts:', error);
    throw error;
  }
}

// Get all technician inventories with filters
export async function getAllTechnicianInventories(technician, product, model, sparePart) {
  try {
    let whereClause = {};

    if (technician) {
      whereClause.TechnicianId = technician;
    }

    const inventories = await TechnicianInventory.findAll({
      where: whereClause,
      include: [
        {
          model: Technician,
          as: 'Technician',
          attributes: ['Id', 'TechnicianName']
        }
      ],
      attributes: ['Id', 'Sku', 'SpareName', 'GoodQty', 'DefectiveQty', 'TechnicianId']
    });

    const formatted = inventories.map(inv => ({
      id: inv.Id,
      technicianId: inv.TechnicianId,
      technicianName: inv.Technician?.TechnicianName || `Technician ${inv.TechnicianId}`,
      partCode: inv.Sku,
      partDescription: inv.SpareName,
      goodQty: inv.GoodQty,
      defectiveQty: inv.DefectiveQty,
      totalQty: inv.GoodQty + inv.DefectiveQty
    }));

    return formatted;
  } catch (error) {
    console.error('Error fetching technician inventories:', error);
    throw error;
  }
}
