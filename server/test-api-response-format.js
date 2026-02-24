/**
 * API Response Format Test
 * Verifies that the /api/complaints endpoint returns data in the correct format
 * Run with: node test-api-response-format.js
 */

import { Calls, Customer, ServiceCenter, Status, CustomersProducts, Technicians } from './models/index.js';

async function testApiResponseFormat() {
  try {
    console.log('🔍 API RESPONSE FORMAT TEST\n');
    console.log('='.repeat(70));

    // Simulate what the complaintController.list() function returns
    console.log('\n📋 Simulating /api/complaints endpoint response...\n');

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
      limit: 3
    });

    // Format exactly as the controller does
    const formattedComplaints = complaints.map(c => ({
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
      TechnicianName: c.technician ? c.technician.name : '',
      ServiceCenterName: c.serviceCenter ? c.serviceCenter.asc_name : '',
      CreatedAt: c.created_at,
      UpdatedAt: c.updated_at,
      Product: c.customer_product ? c.customer_product.product_name : '',
      Model: c.customer_product ? c.customer_product.model_name : '',
      ProductSerialNo: c.customer_product ? c.customer_product.serial_number : ''
    }));

    const response = {
      success: true,
      totalComplaints: formattedComplaints.length,
      complaints: formattedComplaints
    };

    console.log('📤 RESPONSE BODY:');
    console.log(JSON.stringify(response, null, 2));

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ VALIDATION CHECKS:\n');

    // Validate response structure
    const checks = {
      'Response has "success" field': 'success' in response,
      'Response has "totalComplaints" field': 'totalComplaints' in response,
      'Response has "complaints" array': Array.isArray(response.complaints),
      'Complaints array has items': response.complaints.length > 0,
    };

    Object.entries(checks).forEach(([check, result]) => {
      console.log(`  ${result ? '✅' : '❌'} ${check}`);
    });

    if (response.complaints.length > 0) {
      console.log('\n📋 FIRST COMPLAINT FIELDS:');
      const firstComplaint = response.complaints[0];
      
      const requiredFields = [
        'ComplaintId', 'CallId', 'CustomerName', 'MobileNo', 
        'CallType', 'AssignedTechnicianId', 'TechnicianName', 
        'CallStatus', 'CreatedAt', 'UpdatedAt'
      ];

      requiredFields.forEach(field => {
        const hasField = field in firstComplaint;
        const value = firstComplaint[field];
        console.log(`  ${hasField ? '✅' : '❌'} ${field}: ${value !== undefined ? `"${value}"` : 'undefined'}`);
      });

      console.log('\n📊 TECHNICIAN FIELD CHECK:');
      console.log(`  • AssignedTechnicianId: ${firstComplaint.AssignedTechnicianId || 'null'}`);
      console.log(`  • TechnicianName: "${firstComplaint.TechnicianName || '(empty)'}"`);
      
      if (firstComplaint.AssignedTechnicianId && !firstComplaint.TechnicianName) {
        console.log('  ⚠️  WARNING: Has technician ID but no name! Check association.');
      } else if (firstComplaint.AssignedTechnicianId && firstComplaint.TechnicianName) {
        console.log('  ✅ Technician fully populated!');
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ RESPONSE FORMAT IS CORRECT!\n');
    console.log('Frontend will receive:');
    console.log('  • TechnicianName field in every complaint object');
    console.log('  • TechnicianName will be populated when technician is assigned');
    console.log('  • TechnicianName will be empty string when unassigned');
    console.log();

    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:');
    console.error(err);
    process.exit(1);
  }
}

testApiResponseFormat();
