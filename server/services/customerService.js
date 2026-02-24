import { Customer, Product } from '../models/index.js';
import { Op } from 'sequelize';

async function createCustomer(data){
  if (!data.name || !data.mobile_no) {
    const err = new Error('Name and mobile_no are required');
    err.status = 400;
    throw err;
  }

  const existingCustomer = await Customer.findOne({ where: { mobile_no: data.mobile_no } });
  if (existingCustomer) {
    const err = new Error('Customer already exists');
    err.status = 409;
    err.details = [`A customer with mobile number ${data.mobile_no} already exists`];
    throw err;
  }

  const newCustomer = await Customer.create({
    name: data.name,
    mobile_no: data.mobile_no,
    alt_mob_no: data.alt_mob_no || null,
    email: data.email || null,
    house_no: data.house_no || null,
    street_name: data.street_name || null,
    building_name: data.building_name || null,
    area: data.area || null,
    landmark: data.landmark || null,
    state_id: data.state_id || null,
    city_id: data.city_id || null,
    pincode: data.pincode || null,
    customer_code: data.customer_code || `CUST-${Date.now()}`,
    customer_priority: data.customer_priority || 'medium',
  });

  return newCustomer;
}

async function searchCustomer(criteria){
  const { mobileNo, altMobile, productSerialNo, customerCode, name, state, city, pincode } = criteria || {};
  const whereClause = {};
  
  if (mobileNo?.trim()) whereClause.mobile_no = mobileNo.trim();
  if (altMobile?.trim()) whereClause.alt_mob_no = altMobile.trim();
  if (customerCode?.trim()) whereClause.customer_code = customerCode.trim();
  if (name?.trim()) whereClause.name = { [Op.substring]: name.trim() };
  
  // Convert state and city to integers if provided
  if (state) {
    const stateId = parseInt(state, 10);
    if (!isNaN(stateId)) whereClause.state_id = stateId;
  }
  if (city) {
    const cityId = parseInt(city, 10);
    if (!isNaN(cityId)) whereClause.city_id = cityId;
  }
  
  if (pincode?.trim()) whereClause.pincode = pincode.trim();

  let customer = null;
  if (productSerialNo?.trim()) {
    customer = await Customer.findOne({ 
      include: [{ 
        model: Product, 
        where: { serial_no: productSerialNo.trim() }, 
        required: true 
      }] 
    });
  } else {
    if (Object.keys(whereClause).length > 0) {
      customer = await Customer.findOne({ where: whereClause });
    }

    // Fallback: partial mobile match
    if (!customer && mobileNo && typeof mobileNo === 'string') {
      const cleaned = mobileNo.replace(/\D/g, '');
      const suffix = cleaned.length > 6 ? cleaned.slice(-10) : cleaned;
      if (suffix) {
        customer = await Customer.findOne({ 
          where: { mobile_no: { [Op.like]: `%${suffix}` } } 
        });
      }
    }

    // Fallback: partial name match
    if (!customer && name && typeof name === 'string') {
      customer = await Customer.findOne({ 
        where: { name: { [Op.substring]: name.trim() } } 
      });
    }
  }

  return customer;
}

export default {
  createCustomer,
  searchCustomer,
};
