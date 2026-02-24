import express from 'express';
import { lookupCustomer, registerCustomer, updateCustomer, addCustomerProduct, registerComplaint, processComplaint, getServiceCentersByPincode, assignComplaintToASC, getComplaintsByServiceCenter } from '../controllers/callCenterController.js';
import { Users, ServiceCenterPincodes, ServiceCenter, Calls } from '../models/index.js';

const router = express.Router();

// Customer lookup by mobile number
router.get('/customer/:mobileNo', lookupCustomer);

// Register new customer
router.post('/customer', registerCustomer);

// Update existing customer
router.put('/customer/:customerId', updateCustomer);

// Add product to customer
router.post('/customer/:customerId/product', addCustomerProduct);

// Register complaint for customer with existing product
router.post('/complaint', registerComplaint);

// Get service centers by pincode
router.get('/service-centers/pincode/:pincode', getServiceCentersByPincode);

// Get complaints assigned to a service center
router.get('/complaints/by-service-center/:ascId', getComplaintsByServiceCenter);

// Assign complaint to service center
router.post('/complaint/assign-asc', assignComplaintToASC);

// Full workflow: lookup/register customer, add product, register complaint (all in one)
router.post('/process-complaint', processComplaint);

// DEBUG: List all users (temporary - for testing only)
router.get('/debug/users', async (req, res) => {
  try {
    const users = await Users.findAll({
      attributes: ['user_id', 'name', 'email', 'password', 'role_id', 'status']
    });
    
    if(users.length === 0) {
      return res.json({ 
        message: 'No users found in database',
        total: 0,
        instructions: 'Create a test user with: INSERT INTO users (name, email, password, role_id, status) VALUES (\'Test User\', \'test@test.com\', \'testpass\', 1, \'active\')'
      });
    }
    
    return res.json({ 
      total: users.length,
      users: users.map(u => ({
        id: u.user_id,
        name: u.name,
        email: u.email,
        password: u.password,
        role_id: u.role_id,
        status: u.status
      }))
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});

// DEBUG: Check service center pincodes data
router.get('/debug/service-center-pincodes/:pincode', async (req, res) => {
  try {
    const { pincode } = req.params;
    console.log(`\n📍 DEBUG: Checking service center pincodes for: ${pincode}`);
    
    // Query without include to see raw data
    const rawData = await ServiceCenterPincodes.findAll({
      where: { serviceable_pincode: pincode.trim() },
      attributes: ['id', 'asc_id', 'serviceable_pincode', 'location_type', 'two_way_distance'],
      raw: true
    });
    
    console.log(`✓ Found ${rawData.length} raw records`);
    
    // Get ASC IDs that were found
    const ascIds = rawData.map(r => r.asc_id);
    console.log(`Service Center IDs found: ${ascIds.join(', ')}`);
    
    // Check if service centers exist
    const allServiceCenters = await ServiceCenter.findAll({
      attributes: ['asc_id', 'asc_name', 'asc_code'],
      raw: true
    });
    
    // If we found ascIds, fetch their details
    let scDetails = [];
    if (ascIds.length > 0) {
      scDetails = await ServiceCenter.findAll({
        where: { asc_id: ascIds },
        attributes: ['asc_id', 'asc_name', 'asc_code'],
        raw: true
      });
    }
    
    res.json({
      search_pincode: pincode,
      raw_count: rawData.length,
      raw_data: rawData,
      found_asc_ids: ascIds,
      service_center_details: scDetails,
      total_service_centers_in_db: allServiceCenters.length,
      all_service_centers: allServiceCenters
    });
  } catch (err) {
    console.error('Error in debug endpoint:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// DEBUG: Check complaints assigned to service center
router.get('/debug/complaints-for-asc/:ascId', async (req, res) => {
  try {
    const { ascId } = req.params;
    console.log(`\n📍 DEBUG: Checking complaints for ASC ID: ${ascId}`);
    
    // Get all complaints assigned to this ASC
    const complaints = await Calls.findAll({
      where: { assigned_asc_id: parseInt(ascId) },
      attributes: ['call_id', 'customer_id', 'assigned_asc_id', 'remark', 'visit_date', 'visit_time', 'status_id', 'created_at'],
      raw: true
    });
    
    console.log(`✓ Found ${complaints.length} complaints for ASC ${ascId}`);
    
    // Also check if this ASC exists
    const serviceCenter = await ServiceCenter.findByPk(parseInt(ascId), {
      attributes: ['asc_id', 'asc_name', 'user_id']
    });
    
    res.json({
      asc_id: ascId,
      service_center_exists: !!serviceCenter,
      service_center: serviceCenter,
      complaints_count: complaints.length,
      complaints: complaints
    });
  } catch (err) {
    console.error('Error in debug endpoint:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

export default router;
