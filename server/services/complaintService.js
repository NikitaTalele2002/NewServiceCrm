import { poolPromise } from '../db.js';
import sql from 'mssql';
import * as autoAssign from '../routes/autoAssign.js';

async function findOrResolveCustomer({ pool, customerId, mobileNo }){
  let dbCustomer = null;
  if(customerId){
    const byId = await pool.request().input('CustomerId', sql.Int, Number(customerId)).query('SELECT TOP 1 * FROM Customers WHERE Id = @CustomerId');
    if(byId.recordset && byId.recordset.length) dbCustomer = byId.recordset[0];
  }
  if(!dbCustomer && mobileNo){
    const result = await pool.request().input('MobileNo', sql.NVarChar, mobileNo).query('SELECT TOP 1 * FROM Customers WHERE MobileNo = @MobileNo');
    if(result.recordset && result.recordset.length) dbCustomer = result.recordset[0];
    else {
      const cleaned = (mobileNo || '').replace(/\D/g, '');
      const suffix = cleaned.length > 6 ? cleaned.slice(-10) : cleaned;
      if(suffix){
        const fuzzy = await pool.request().input('Suffix', sql.NVarChar, `%${suffix}`).query('SELECT TOP 1 * FROM Customers WHERE MobileNo LIKE @Suffix');
        if(fuzzy.recordset && fuzzy.recordset.length) dbCustomer = fuzzy.recordset[0];
      }
    }
  }
  return dbCustomer;
}

async function registerComplaint(payload){
  const { mobileNo, complaintId, customerId, name, callInfo, product } = payload;
  const pool = await poolPromise;
  if(!mobileNo && !customerId) throw new Error('mobileNo or customerId required');

  const dbCustomer = await findOrResolveCustomer({ pool, customerId, mobileNo });
  if(!dbCustomer) throw Object.assign(new Error('Customer not found. Please register customer first.'), { status: 404 });

  // Auto assign center
  let assignedCenterId = null;
  try{
    const customerAddress = dbCustomer?.Address || dbCustomer?.Area || dbCustomer?.CustomerAddress || null;
    const { bestCenter } = await autoAssign.findNearestCenter({ pincode: dbCustomer?.PinCode || null, customerAddress, customer: dbCustomer });
    if(bestCenter && bestCenter.Id) assignedCenterId = bestCenter.Id;
  }catch(e){
    try{
      const anyCenter = await pool.request().query('SELECT TOP 1 Id, CenterName FROM ServiceCenters');
      if(anyCenter.recordset.length) assignedCenterId = anyCenter.recordset[0].Id;
    }catch(_){}
  }

  // Resolve productFromDb if provided
  let productFromDb = null;
  try{
    if(product && (product.Id || product.ProductId || product.ProductSerialNo)){
      if(product.Id || product.ProductId){
        const pId = product.Id || product.ProductId;
        const pres = await pool.request().input('pId', sql.Int, pId).query('SELECT TOP 1 * FROM Products WHERE Id = @pId');
        if(pres.recordset && pres.recordset.length) productFromDb = pres.recordset[0];
      }
      if(!productFromDb && product.ProductSerialNo){
        const pres2 = await pool.request().input('pSN', sql.NVarChar, product.ProductSerialNo).query('SELECT TOP 1 * FROM Products WHERE ProductSerialNo = @pSN');
        if(pres2.recordset && pres2.recordset.length) productFromDb = pres2.recordset[0];
      }
    }
  }catch(e){ console.warn('Error fetching product from DB:', e && e.message ? e.message : e); }

  // Build insert dynamically based on column checks (kept simple here)
  const req = pool.request()
    .input('MobileNo', sql.NVarChar, mobileNo)
    .input('Name', sql.NVarChar, name || dbCustomer.Name)
    .input('AssignedCenterId', sql.Int, assignedCenterId);

  const columns = ['MobileNo','Name','AssignedCenterId','CreatedAt'];
  const values = ['@MobileNo','@Name','@AssignedCenterId','GETDATE()'];

  if(customerId || dbCustomer?.Id){ req.input('CustomerId', sql.Int, customerId || dbCustomer.Id); columns.push('CustomerId'); values.push('@CustomerId'); }
  if(complaintId){ req.input('ComplaintId', sql.NVarChar, complaintId); columns.push('ComplaintId'); values.push('@ComplaintId'); }
  if(productFromDb){ req.input('ProductId', sql.Int, productFromDb.Id); columns.push('ProductId'); values.push('@ProductId'); }
  if(productFromDb && productFromDb.ProductSerialNo){ req.input('ProductSerialNo', sql.NVarChar, productFromDb.ProductSerialNo); columns.push('ProductSerialNo'); values.push('@ProductSerialNo'); }
  if(callInfo && callInfo.CallType){ req.input('CallType', sql.NVarChar, callInfo.CallType); columns.push('CallType'); values.push('@CallType'); }
  if(callInfo && (callInfo.CallStatus || productFromDb?.CallStatus)){ req.input('CallStatus', sql.NVarChar, callInfo?.CallStatus || productFromDb?.CallStatus || 'Open'); columns.push('CallStatus'); values.push('@CallStatus'); }

  // Additional optional fields
  if(callInfo && callInfo.CustomerRemarks){ req.input('CustomerRemarks', sql.NVarChar, callInfo.CustomerRemarks); columns.push('CustomerRemarks'); values.push('@CustomerRemarks'); }
  if(callInfo && callInfo.AppointmentDate){ req.input('AppointmentDate', sql.Date, callInfo.AppointmentDate); columns.push('AppointmentDate'); values.push('@AppointmentDate'); }
  if(callInfo && callInfo.AppointmentTime){ req.input('AppointmentTime', sql.NVarChar, callInfo.AppointmentTime); columns.push('AppointmentTime'); values.push('@AppointmentTime'); }
  if(callInfo && callInfo.CallerType){ req.input('CallerType', sql.NVarChar, callInfo.CallerType); columns.push('CallerType'); values.push('@CallerType'); }
  if(callInfo && callInfo.DealerName){ req.input('DealerName', sql.NVarChar, callInfo.DealerName); columns.push('DealerName'); values.push('@DealerName'); }
  if(callInfo && callInfo.Qty !== undefined){ req.input('Qty', sql.Int, callInfo.Qty); columns.push('Qty'); values.push('@Qty'); }
  if(callInfo && (callInfo.Distance || callInfo.DistanceKm)){ req.input('DistanceKm', sql.Decimal(10,2), callInfo.Distance || callInfo.DistanceKm); columns.push('DistanceKm'); values.push('@DistanceKm'); }

  const insertQuery = `INSERT INTO ComplaintRegistration (${columns.join(', ')}) VALUES (${values.join(', ')})`;
  await req.query(insertQuery);

  return { success: true, assignedCenterId };
}

async function listComplaints({ centerId, user }){
  const pool = await poolPromise;
  // Determine centerId if not provided
  let resolvedCenterId = centerId || null;
  if(user){ if(user.centerId) resolvedCenterId = user.centerId; }

  const complaintsRes = await pool.request().query(`
    SELECT
      c.call_id AS ComplaintId,
      c.created_at AS CreatedAt,
      c.caller_mobile_no AS MobileNo,
      cust.customer_id AS CustomerId,
      cust.name AS CustomerName,
      cust.email AS Email,
      cust.house_no AS HouseNo,
      cust.building_name AS BuildingName,
      cust.street_name AS StreetName,
      cust.area AS Area,
      cust.landmark AS Landmark,
      cust.state_id AS State,
      cust.city_id AS City,
      cust.pincode AS Pincode,
      cust.customer_code AS CustomerType,
      cust.alt_mob_no AS AltMobile,
      0 AS ProductId,
      '' AS Product,
      '' AS ProductGroup,
      '' AS Brand,
      '' AS Model,
      '' AS ModelDescription,
      '' AS ProductSerialNo,
      '' AS WarrantyStatus,
      NULL AS PurchaseDate,
      '' AS DealerName,
      c.call_type AS CallStatus,
      c.assigned_asc_id AS AssignedCenterId,
      c.assigned_tech_id AS AssignedTechnicianId,
      COALESCE(t.name, '') AS TechnicianName,
      COALESCE(t.mobile_no, '') AS TechnicianMobile,
      '' AS CustomerRemarks,
      c.call_source AS CallSource,
      c.caller_mobile_no AS CallerMobile,
      c.remark
    FROM calls c
    LEFT JOIN Customers cust ON cust.customer_id = c.customer_id
    LEFT JOIN Technicians t ON t.technician_id = c.assigned_tech_id
    ORDER BY c.created_at DESC
  `);

  let complaints = complaintsRes.recordset || [];
  if(resolvedCenterId){ 
    complaints = complaints.filter(c => String(c.AssignedCenterId) === String(resolvedCenterId)); 
  }
  const techResult = await pool.request().query('SELECT technician_id as Id, name as TechnicianName FROM Technicians');
  return { complaints, technicians: techResult.recordset };
}

async function assignTechnician({ complaintId, technicianId }){
  if(!complaintId || !technicianId) throw Object.assign(new Error('Missing complaintId or technicianId'), { status: 400 });
  const pool = await poolPromise;
  
  // Query from calls table instead of ComplaintRegistration
  const complaintRes = await pool.request()
    .input('ComplaintId', sql.NVarChar, String(complaintId))
    .query('SELECT call_id, assigned_asc_id, status_id FROM calls WHERE call_id = @ComplaintId');
  
  if(!complaintRes.recordset.length) throw Object.assign(new Error('Complaint not found'), { status: 404 });
  
  const assignedCenterId = complaintRes.recordset[0].assigned_asc_id;
  if(!assignedCenterId) throw Object.assign(new Error("Complaint is not assigned to any service center"), { status: 400 });

  // Query technician from technicians table
  const techRes = await pool.request()
    .input('TechnicianId', sql.Int, Number(technicianId))
    .query('SELECT technician_id, name, service_center_id, status FROM technicians WHERE technician_id = @TechnicianId AND status = \'active\'');
  
  if(!techRes.recordset.length) throw Object.assign(new Error('Technician not found or inactive'), { status: 404 });
  
  const technician = techRes.recordset[0];
  if(String(technician.service_center_id) !== String(assignedCenterId)) throw Object.assign(new Error('Technician is not allocated at this complaint\'s service center'), { status: 403 });

  // Get "assigned to the technician" sub-status
  let subStatusId = null;
  try {
    const statusId = complaintRes.recordset[0].status_id;
    const subStatusRes = await pool.request()
      .input('StatusId', sql.Int, statusId)
      .query(`SELECT TOP 1 sub_status_id FROM sub_status 
              WHERE status_id = @StatusId AND LOWER(sub_status_name) = LOWER('assigned to the technician')`);
    
    if(subStatusRes.recordset.length) {
      subStatusId = subStatusRes.recordset[0].sub_status_id;
    }
  } catch(e) {
    console.warn('Error getting sub-status for technician assignment:', e.message);
  }

  // Update calls table with assigned technician and sub-status
  await pool.request()
    .input('ComplaintId', sql.NVarChar, String(complaintId))
    .input('TechnicianId', sql.Int, Number(technicianId))
    .input('SubStatusId', sql.Int, subStatusId)
    .query(`UPDATE calls SET assigned_tech_id = @TechnicianId, sub_status_id = @SubStatusId WHERE call_id = @ComplaintId`);

  return { assignedTechnicianId: technician.technician_id, assignedTechnicianName: technician.name };
}

export default {
  registerComplaint,
  listComplaints,
  assignTechnician
};
