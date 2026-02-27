import complaintService from '../services/complaintService.js';
import { Calls, Customer, ServiceCenter, Status, CustomersProducts, Technicians } from '../models/index.js';

async function register(req, res){
  try{
    const result = await complaintService.registerComplaint(req.body);
    return res.json(result);
  }catch(err){
    console.error('Register complaint error:', err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Failed to register complaint' });
  }
}

async function list(req, res){
  try{
    // Fetch complaints using Sequelize models instead of raw SQL to include technician data
    const complaints = await Calls.findAll({
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['customer_id', 'name', 'mobile_no', 'email', 'pincode'],
          required: false
        },
        {
          model: ServiceCenter,
          as: 'serviceCenter',
          attributes: ['asc_id', 'asc_name', 'asc_code'],
          required: false
        },
        {
          model: Status,
          as: 'status',
          attributes: ['status_id', 'status_name'],
          required: false
        },
        {
          model: CustomersProducts,
          as: 'customer_product',
          attributes: ['customers_products_id', 'product_id', 'model_id', 'serial_no'],
          required: false
        },
        {
          model: Technicians,
          as: 'technician',
          attributes: ['technician_id', 'name'],
          required: false
        }
      ],
      attributes: [
        'call_id', 'customer_id', 'customer_product_id', 'assigned_asc_id', 
        'assigned_tech_id', 'call_type', 'call_source', 'status_id', 'remark', 
        'visit_date', 'visit_time', 'created_at', 'updated_at'
      ],
      order: [['created_at', 'DESC']],
      raw: false,
      subQuery: false
    });

    console.log(`✅ Fetched ${complaints.length} complaints with associations`);

    // Format response to match frontend expectations
    const formattedComplaints = complaints.map(c => {
      let technicianName = '';
      
      // Debug: Log technician data if assigned
      if (c.assigned_tech_id) {
        if (c.technician) {
          technicianName = c.technician.name || '';
          console.log(`📌 Call ${c.call_id}: Tech ID ${c.assigned_tech_id} → Name: ${technicianName}`);
        } else {
          console.log(`⚠️  Call ${c.call_id}: Has Tech ID ${c.assigned_tech_id} but no technician association!`);
        }
      }
      
      return {
        ComplaintId: c.call_id,
        CallId: c.call_id,
        CustomerId: c.customer_id,
        CustomerName: c.customer ? c.customer.name : 'Unknown',
        MobileNo: c.customer ? c.customer.mobile_no : null,
        Email: c.customer ? c.customer.email : null,
        Pincode: c.customer ? c.customer.pincode : null,
        CallType: c.call_type,
        CallSource: c.call_source,
        Remark: c.remark || '',
        VisitDate: c.visit_date || null,
        VisitTime: c.visit_time || null,
        CallStatus: c.status ? c.status.status_name : (c.call_type || 'Open'),
        StatusId: c.status_id,
        AssignedCenterId: c.assigned_asc_id,
        AssignedTechnicianId: c.assigned_tech_id,
        TechnicianName: technicianName,
        ServiceCenterName: c.serviceCenter ? c.serviceCenter.asc_name : '',
        CreatedAt: c.created_at,
        UpdatedAt: c.updated_at,
        Product: c.customer_product ? c.customer_product.product_name : '',
        Model: c.customer_product ? c.customer_product.model_name : '',
        ProductSerialNo: c.customer_product ? c.customer_product.serial_number : ''
      };
    });

    return res.json({ 
      success: true,
      totalComplaints: formattedComplaints.length,
      complaints: formattedComplaints 
    });
  }catch(err){
    console.error('❌ Error fetching complaints:', err);
    console.error('Stack:', err.stack);
    
    // Fall back to using raw SQL if Sequelize fails
    try {
      console.log('⚠️  Falling back to service method...');
      const centerId = req.query.centerId || null;
      const result = await complaintService.listComplaints({ centerId, user: req.user });
      return res.json(result);
    } catch (fallbackErr) {
      console.error('❌ Fallback also failed:', fallbackErr);
      return res.status(500).json({ 
        message: 'Error fetching complaints', 
        error: err && err.message ? err.message : String(err),
        complaints: []
      });
    }
  }
}

async function assignTechnician(req, res){
  try{
    const { complaintId, technicianId, assignmentReason } = req.body;
    const result = await complaintService.assignTechnician({ complaintId, technicianId, assignmentReason });
    return res.json({ 
      success: true,
      message: `Technician ${result.assignedTechnicianName} ${result.isReallocation ? 're-' : ''}assigned successfully to call ${complaintId}`,
      data: {
        callId: complaintId,
        assignedTechnicianId: result.assignedTechnicianId,
        assignedTechnicianName: result.assignedTechnicianName,
        isReallocation: result.isReallocation,
        status: result.status,
        statusId: result.statusId
      }
    });
  }catch(err){
    console.error('Assign tech error:', err);
    const status = err.status || 500;
    return res.status(status).json({ 
      success: false,
      message: err.message || 'Error assigning technician', 
      error: err && err.message ? err.message : String(err) 
    });
  }
}

export default {
  register,
  list,
  assignTechnician
};
