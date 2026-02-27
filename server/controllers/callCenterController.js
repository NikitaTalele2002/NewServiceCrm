import { Customer, CustomersProducts, Product, ProductModel, Calls, Dealers, Status, SubStatus, ServiceCenter, ServiceCenterPincodes, Users, Technicians, ActionLog } from '../models/index.js';

/**
 * Lookup customer by mobile number
 * Returns customer details with their registered products
 */
export const lookupCustomer = async (req, res) => {
  try {
    const { mobileNo } = req.params;
    
    // Validate input
    if (!mobileNo || mobileNo.trim() === '') {
      return res.status(400).json({ 
        error: 'Mobile number is required',
        field: 'mobileNo'
      });
    }

    // Find customer
    const customer = await Customer.findOne({
      where: { mobile_no: mobileNo },
      attributes: [
        'customer_id', 'name', 'mobile_no', 'alt_mob_no', 'email',
        'house_no', 'street_name', 'building_name', 'area', 'landmark',
        'city_id', 'state_id', 'pincode', 'customer_code', 'customer_priority'
      ]
    });

    if (!customer) {
      return res.status(404).json({ 
        success: false,
        error: 'Customer not found',
        customer: null 
      });
    }

    // Get customer's products with details
    const products = await CustomersProducts.findAll({
      where: { customer_id: customer.customer_id },
      attributes: [
        'customers_products_id', 'product_id', 'model_id', 'serial_no',
        'date_of_purchase', 'warranty_status', 'qty_with_customer'
      ],
      include: [
        { 
          model: Product,
          as: 'Product',
          attributes: ['ID', 'VALUE', 'DESCRIPTION'],
          required: false 
        },
        { 
          model: ProductModel, 
          as: 'ProductModel',
          attributes: ['Id', 'MODEL_CODE', 'MODEL_DESCRIPTION'],
          required: false 
        }
      ]
    });

    // Format response
    res.status(200).json({
      success: true,
      customer: {
        customer_id: customer.customer_id,
        name: customer.name,
        mobile_no: customer.mobile_no,
        alt_mob_no: customer.alt_mob_no,
        email: customer.email,
        address: {
          house_no: customer.house_no,
          street_name: customer.street_name,
          building_name: customer.building_name,
          area: customer.area,
          landmark: customer.landmark,
          city_id: customer.city_id,
          state_id: customer.state_id,
          pincode: customer.pincode ? String(customer.pincode).trim() : null
        },
        customer_code: customer.customer_code,
        priority: customer.customer_priority
      },
      products: products.map(p => ({
        customers_products_id: p.customers_products_id,
        product_id: p.product_id,
        product_name: p.Product?.VALUE || p.Product?.DESCRIPTION || 'Unknown',
        product_pk: p.Product?.ID || null,
        model_id: p.model_id,
        model_code: p.ProductModel?.MODEL_CODE,
        model_description: p.ProductModel?.MODEL_DESCRIPTION,
        serial_no: p.serial_no,
        date_of_purchase: p.date_of_purchase,
        warranty_status: p.warranty_status,
        qty_with_customer: p.qty_with_customer || 1
      }))
    });
  } catch (err) {
    console.error('Error looking up customer:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to lookup customer',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Register new customer
 */
export const registerCustomer = async (req, res) => {
  try {
    console.log('=== Registering Customer ===');
    console.log('Request body:', req.body);
    
    const { 
      name, mobile_no, alt_mob_no, email, 
      house_no, street_name, building_name, area, landmark,
      city_id, state_id, pincode, 
      created_by,
      customer_priority
    } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        error: 'Customer name is required',
        field: 'name'
      });
    }

    if (!mobile_no || !mobile_no.trim()) {
      return res.status(400).json({ 
        error: 'Mobile number is required',
        field: 'mobile_no'
      });
    }

    // Validate mobile number format (basic validation)
    if (!/^\d{10,15}$/.test(mobile_no.replace(/[^\d]/g, ''))) {
      return res.status(400).json({ 
        error: 'Invalid mobile number format',
        field: 'mobile_no'
      });
    }

    // Check if customer already exists
    const existing = await Customer.findOne({ 
      where: { mobile_no: mobile_no.trim() } 
    });
    
    if (existing) {
      return res.status(409).json({ 
        error: 'Customer with this mobile number already exists',
        customer_id: existing.customer_id,
        field: 'mobile_no'
      });
    }

    // Validate email if provided (basic validation)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format',
        field: 'email'
      });
    }

    // Check if email already exists (if provided)
    if (email && email.trim()) {
      const existingEmail = await Customer.findOne({
        where: { email: email.trim() }
      });
      if (existingEmail) {
        return res.status(409).json({
          error: 'A customer with this email already exists',
          field: 'email'
        });
      }
    }

    const toIntOrNull = (value) => {
      if (value === null || value === undefined || String(value).trim() === '') return null;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parseInt(parsed, 10);
    };

    const customerCode = `CUST-${Date.now()}`;
    const safeCityId = toIntOrNull(city_id);
    const safeStateId = toIntOrNull(state_id);
    const safeCreatedBy = toIntOrNull(created_by);

    console.log('Creating customer with data:', {
      name, mobile_no, alt_mob_no, email, house_no, street_name, building_name,
      area, landmark, city_id: safeCityId, state_id: safeStateId, pincode, created_by: safeCreatedBy
    });

    const columnsMeta = await Customer.sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'customers'`,
      { type: Customer.sequelize.QueryTypes.SELECT }
    );

    const metaByColumn = new Map((columnsMeta || []).map((c) => [String(c.COLUMN_NAME).toLowerCase(), String(c.DATA_TYPE).toLowerCase()]));
    const hasColumn = (name) => metaByColumn.has(name.toLowerCase());
    const dataTypeOf = (name) => metaByColumn.get(name.toLowerCase());

    const insertData = {
      name: name.trim(),
      mobile_no: mobile_no.trim(),
      alt_mob_no: alt_mob_no ? String(alt_mob_no).trim() : null,
      email: email ? email.trim() : null,
      house_no: house_no || null,
      street_name: street_name || null,
      building_name: building_name || null,
      area: area || null,
      landmark: landmark || null,
      city_id: safeCityId,
      state_id: safeStateId,
      pincode: pincode || null,
      customer_code: customerCode,
    };

    if (hasColumn('created_by')) {
      insertData.created_by = safeCreatedBy;
    }

    if (hasColumn('customer_priority')) {
      const priorityType = dataTypeOf('customer_priority');
      if (['int', 'bigint', 'smallint', 'tinyint'].includes(priorityType)) {
        const rawPriority = customer_priority ?? 'medium';
        const priorityMap = { low: 1, medium: 2, high: 3, vip: 4 };
        const parsedPriority = toIntOrNull(rawPriority);
        insertData.customer_priority = parsedPriority ?? priorityMap[String(rawPriority).toLowerCase()] ?? 2;
      } else {
        insertData.customer_priority = String(customer_priority || 'medium').toLowerCase();
      }
    }

    const allowedEntries = Object.entries(insertData).filter(([column]) => hasColumn(column));
    const sqlColumns = allowedEntries.map(([column]) => `[${column}]`).join(', ');
    const sqlValues = allowedEntries.map(([column]) => `:${column}`).join(', ');
    const replacements = Object.fromEntries(allowedEntries);

    await Customer.sequelize.query(
      `INSERT INTO [customers] (${sqlColumns}) VALUES (${sqlValues})`,
      {
        replacements,
        type: Customer.sequelize.QueryTypes.INSERT,
      }
    );

    const insertedCustomer = await Customer.findOne({
      where: { mobile_no: mobile_no.trim() },
      order: [['customer_id', 'DESC']],
      raw: true,
    });

    console.log('Customer created successfully:', insertedCustomer?.customer_id);

    // Return customer details
    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      customer: {
        customer_id: insertedCustomer?.customer_id,
        name: insertedCustomer?.name,
        mobile_no: insertedCustomer?.mobile_no,
        alt_mob_no: insertedCustomer?.alt_mob_no,
        email: insertedCustomer?.email,
        address: {
          house_no: insertedCustomer?.house_no,
          street_name: insertedCustomer?.street_name,
          building_name: insertedCustomer?.building_name,
          area: insertedCustomer?.area,
          landmark: insertedCustomer?.landmark,
          city_id: insertedCustomer?.city_id,
          state_id: insertedCustomer?.state_id,
          pincode: insertedCustomer?.pincode ? String(insertedCustomer.pincode).trim() : null
        },
        customer_code: insertedCustomer?.customer_code,
        customer_priority: insertedCustomer?.customer_priority
      }
    });
  } catch (err) {
    console.error('Error registering customer:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
      sql: err.sql
    });

    // Handle specific database errors
    if (err.name === 'SequelizeUniqueConstraintError') {
      const field = err.fields ? Object.keys(err.fields)[0] : 'unknown';
      return res.status(409).json({
        success: false,
        error: `A customer with this ${field} already exists`,
        field: field,
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }

    if (err.name === 'SequelizeForeignKeyConstraintError') {
      const field = err.fields ? err.fields[0] : 'location';
      return res.status(400).json({
        success: false,
        error: `Invalid ${field} selected. Please select valid State/City/Pincode`,
        field: field,
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }

    if (err.name === 'SequelizeValidationError') {
      const message = err.errors && err.errors[0] ? err.errors[0].message : err.message;
      return res.status(400).json({
        success: false,
        error: message,
        details: process.env.NODE_ENV === 'development' ? err.errors : undefined
      });
    }

    // Generic error response
    res.status(500).json({ 
      success: false,
      error: 'Failed to register customer',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Add product to customer (register product ownership)
 */
export const addCustomerProduct = async (req, res) => {
  try {
    const { customerId } = req.params;
    const {
      product_id,
      model_id,
      serial_no,
      serial_number,
      date_of_purchase,
      purchase_date,
      qty_with_customer,
      created_by,
    } = req.body;

    const toIntOrNull = (value) => {
      if (value === null || value === undefined || String(value).trim() === '') return null;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parseInt(parsed, 10);
    };

    const safeCustomerId = toIntOrNull(customerId);
    const safeProductId = toIntOrNull(product_id);
    const safeModelId = toIntOrNull(model_id);
    const safeQty = toIntOrNull(qty_with_customer) || 1;
    const safeCreatedBy = toIntOrNull(created_by);
    const normalizedSerialNo = (serial_no || serial_number || '').toString().trim() || null;
    const normalizedPurchaseDate = date_of_purchase || purchase_date || null;

    // Validate required path parameter
    if (!safeCustomerId) {
      return res.status(400).json({ 
        error: 'Valid customer ID is required',
        field: 'customerId'
      });
    }

    // Validate required body fields
    if (!safeProductId) {
      return res.status(400).json({ 
        error: 'Product ID is required',
        field: 'product_id'
      });
    }

    if (normalizedPurchaseDate && isNaN(Date.parse(normalizedPurchaseDate))) {
      return res.status(400).json({ 
        error: 'Valid purchase date is required',
        field: 'date_of_purchase'
      });
    }

    // Verify customer exists
    const customer = await Customer.findByPk(safeCustomerId);
    if (!customer) {
      return res.status(404).json({ 
        error: 'Customer not found',
        field: 'customer_id'
      });
    }

    // Verify product exists
    const productExists = await CustomersProducts.sequelize.query(
      'SELECT TOP 1 [ID] FROM [ProductMaster] WHERE [ID] = :productId',
      {
        replacements: { productId: safeProductId },
        type: CustomersProducts.sequelize.QueryTypes.SELECT,
      }
    );

    if (!Array.isArray(productExists) || productExists.length === 0) {
      return res.status(404).json({
        error: 'Product not found',
        field: 'product_id'
      });
    }

    if (normalizedSerialNo) {
      const existingProduct = await CustomersProducts.sequelize.query(
        `SELECT TOP 1 [customers_products_id]
         FROM [customers_products]
         WHERE [serial_no] = :serialNo`,
        {
          replacements: { serialNo: normalizedSerialNo },
          type: CustomersProducts.sequelize.QueryTypes.SELECT,
        }
      );

      if (Array.isArray(existingProduct) && existingProduct.length > 0) {
        return res.status(409).json({
          error: 'Product with this serial number already registered',
          field: 'serial_no'
        });
      }
    }

    const columnsMeta = await CustomersProducts.sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'customers_products'`,
      { type: CustomersProducts.sequelize.QueryTypes.SELECT }
    );

    const metaByColumn = new Map((columnsMeta || []).map((c) => [String(c.COLUMN_NAME).toLowerCase(), String(c.DATA_TYPE).toLowerCase()]));
    const hasColumn = (name) => metaByColumn.has(name.toLowerCase());

    const insertData = {
      customer_id: safeCustomerId,
      product_id: safeProductId,
      model_id: safeModelId,
      serial_no: normalizedSerialNo,
      purchase_date: normalizedPurchaseDate,
      qty_with_customer: safeQty,
    };

    if (safeModelId) {
      const modelExists = await CustomersProducts.sequelize.query(
        'SELECT TOP 1 [Id] FROM [ProductModels] WHERE [Id] = :modelId',
        {
          replacements: { modelId: safeModelId },
          type: CustomersProducts.sequelize.QueryTypes.SELECT,
        }
      );

      if (!Array.isArray(modelExists) || modelExists.length === 0) {
        insertData.model_id = null;
      }
    }

    if (hasColumn('created_by')) {
      insertData.created_by = safeCreatedBy;
    }

    const allowedEntries = Object.entries(insertData)
      .filter(([column, value]) => hasColumn(column) && value !== undefined);

    const sqlColumns = allowedEntries.map(([column]) => `[${column}]`).join(', ');
    const sqlValues = allowedEntries.map(([column]) => `:${column}`).join(', ');
    const replacements = Object.fromEntries(allowedEntries);

    await CustomersProducts.sequelize.query(
      `INSERT INTO [customers_products] (${sqlColumns}) VALUES (${sqlValues})`,
      {
        replacements,
        type: CustomersProducts.sequelize.QueryTypes.INSERT,
      }
    );

    const selectColumns = ['customers_products_id', 'customer_id', 'product_id', 'model_id', 'serial_no', 'purchase_date', 'date_of_purchase', 'warranty_status', 'status']
      .filter((column) => hasColumn(column))
      .map((column) => `[${column}]`)
      .join(', ');

    let createdRows = [];
    if (selectColumns) {
      if (normalizedSerialNo) {
        createdRows = await CustomersProducts.sequelize.query(
          `SELECT TOP 1 ${selectColumns}
           FROM [customers_products]
           WHERE [serial_no] = :serialNo
           ORDER BY [customers_products_id] DESC`,
          {
            replacements: { serialNo: normalizedSerialNo },
            type: CustomersProducts.sequelize.QueryTypes.SELECT,
          }
        );
      } else {
        createdRows = await CustomersProducts.sequelize.query(
          `SELECT TOP 1 ${selectColumns}
           FROM [customers_products]
           WHERE [customer_id] = :customerId AND [product_id] = :productId
           ORDER BY [customers_products_id] DESC`,
          {
            replacements: { customerId: safeCustomerId, productId: safeProductId },
            type: CustomersProducts.sequelize.QueryTypes.SELECT,
          }
        );
      }
    }

    let createdRow = Array.isArray(createdRows) && createdRows.length > 0 ? createdRows[0] : null;

    if (!createdRow) {
      createdRow = {
        customer_id: safeCustomerId,
        product_id: safeProductId,
        model_id: safeModelId,
        serial_no: normalizedSerialNo,
        date_of_purchase: normalizedPurchaseDate,
        qty_with_customer: safeQty,
      };
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Product registered for customer successfully',
      customer_product: {
        customers_products_id: createdRow.customers_products_id || null,
        customer_id: createdRow.customer_id,
        product_id: createdRow.product_id,
        model_id: createdRow.model_id,
        serial_no: createdRow.serial_no,
        date_of_purchase: createdRow.purchase_date || createdRow.date_of_purchase || null,
        warranty_status: createdRow.warranty_status || null
      }
    });
  } catch (err) {
    console.error('Error adding product:', err);
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid product/model selected',
        details: err.message,
      });
    }
    res.status(500).json({ 
      success: false,
      error: 'Failed to register product',
      details: err.message
    });
  }
};

/**
 * Register complaint (create new call/complaint)
 */
export const registerComplaint = async (req, res) => {
  try {
    const { customer_id, customer_product_id, remark, visit_date, visit_time, assigned_asc_id, created_by } = req.body;

    console.log('📝 registerComplaint called with:', { customer_id, assigned_asc_id, remark, visit_date, visit_time });
    
    // Log the ASC ID specifically
    if (assigned_asc_id) {
      console.log(`✅ Service Center (ASC) ID provided: ${assigned_asc_id}`);
    } else {
      console.log('⚠️ No Service Center (ASC) ID provided - complaint will be created without assignment');
    }

    // Validate required fields
    if (!customer_id) {
      return res.status(400).json({ 
        error: 'Customer ID is required',
        field: 'customer_id'
      });
    }

    if (!remark || !remark.trim()) {
      return res.status(400).json({ 
        error: 'Complaint description is required',
        field: 'remark'
      });
    }

    // Validate dates if provided
    if (visit_date && isNaN(Date.parse(visit_date))) {
      return res.status(400).json({ 
        error: 'Invalid visit date format',
        field: 'visit_date'
      });
    }

    // Verify customer exists
    console.log(`🔍 Checking if customer ${customer_id} exists...`);
    const customer = await Customer.findByPk(customer_id, { raw: true });
    if (!customer) {
      console.warn(`❌ Customer ${customer_id} not found`);
      return res.status(404).json({ 
        error: 'Customer not found',
        field: 'customer_id'
      });
    }
    console.log(`✓ Customer found: ${customer.name}`);

    // Get initial status ID - use first available or default to Open status
    let statusId = null;
    console.log('📊 Looking for available status...');
    
    try {
      // Try to find 'Open' status
      const openStatus = await Calls.sequelize.query(
        "SELECT TOP 1 status_id FROM status WHERE LOWER(status_name) LIKE '%open%'",
        { 
          replacements: [],
          type: Calls.sequelize.QueryTypes.SELECT,
          raw: true 
        }
      );
      
      if (openStatus && openStatus.length > 0) {
        statusId = openStatus[0].status_id;
        console.log(`✓ Found 'Open' status with ID: ${statusId}`);
      } else {
        // If no Open status, get the first available status
        console.log('⚠️ Open status not found, getting any available status');
        const anyStatus = await Calls.sequelize.query(
          'SELECT TOP 1 status_id FROM status ORDER BY status_id',
          { 
            replacements: [],
            type: Calls.sequelize.QueryTypes.SELECT,
            raw: true 
          }
        );
        
        if (anyStatus && anyStatus.length > 0) {
          statusId = anyStatus[0].status_id;
          console.log(`✓ Using first available status ID: ${statusId}`);
        } else {
          statusId = null;
          console.log('⚠️ No status found in database, status_id will be NULL');
        }
      }
    } catch (statusErr) {
      console.warn('⚠️ Error getting status:', statusErr.message);
      statusId = null;
    }

    console.log(`📋 Status ID for new call: ${statusId || 'NULL'}`);

    // Get sub-status ID if service center is assigned
    let subStatusId = null;
    if (assigned_asc_id) {
      try {
        console.log('📊 Looking for "assigned to the service center" sub-status...');
        // If we have "open" status, get the sub-status "assigned to the service center"
        const subStatus = await Calls.sequelize.query(
          `SELECT TOP 1 sub_status_id FROM sub_status 
           WHERE status_id = ? AND LOWER(sub_status_name) = LOWER('assigned to the service center')`,
          { 
            replacements: [statusId],
            type: Calls.sequelize.QueryTypes.SELECT,
            raw: true 
          }
        );
        
        if (subStatus && subStatus.length > 0) {
          subStatusId = subStatus[0].sub_status_id;
          console.log(`✓ Found sub-status "assigned to the service center" with ID: ${subStatusId}`);
        } else {
          console.log('⚠️ Sub-status "assigned to the service center" not found');
        }
      } catch (subStatusErr) {
        console.warn('⚠️ Error getting sub-status:', subStatusErr.message);
      }
    }

    console.log(`📋 Sub-Status ID for new call: ${subStatusId || 'NULL'}`);

    // Parse visit date - handle various formats and convert to YYYY-MM-DD
    let parsedVisitDate = null;
    if (visit_date) {
      try {
        console.log(`📅 Processing visit_date: ${visit_date} (type: ${typeof visit_date})`);
        
        let dateString = null;
        
        // If it's a Date object, extract the date part
        if (visit_date instanceof Date) {
          // Convert Date to ISO string and take first 10 chars (YYYY-MM-DD)
          dateString = visit_date.toISOString().split('T')[0];
          console.log(`   → Converted Date object to: ${dateString}`);
        }
        // If it's a string with timezone info like "2026-02-19 18:30:00.000 +00:00"
        else if (typeof visit_date === 'string' && visit_date.includes(':')) {
          // Extract just the date part (YYYY-MM-DD)
          dateString = visit_date.split(' ')[0];
          console.log(`   → Extracted date from timestamp: ${dateString}`);
        }
        // If it's already a YYYY-MM-DD string
        else if (typeof visit_date === 'string') {
          dateString = visit_date.trim();
          console.log(`   → Using date string as-is: ${dateString}`);
        }
        
        // Validate the final date string format
        if (dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          // Verify it's a valid date by parsing
          const [year, month, day] = dateString.split('-').map(Number);
          const testDate = new Date(year, month - 1, day);
          
          if (testDate.getFullYear() === year && 
              testDate.getMonth() === month - 1 && 
              testDate.getDate() === day) {
            parsedVisitDate = dateString;
            console.log(`✓ Visit date validated: ${parsedVisitDate}`);
          } else {
            console.warn(`⚠️ Date validation failed for: ${dateString}`);
          }
        } else {
          console.warn(`⚠️ Invalid date format: ${dateString}`);
        }
      } catch (dateErr) {
        console.warn(`⚠️ Date parse error: ${dateErr.message}`);
      }
    }
    
    console.log(`📋 Final visit_date for insert: ${parsedVisitDate || 'NULL'}`)

    // Build call data - ONLY include columns that exist in the database
    // Database has: call_id, ref_call_id, customer_id, customer_product_id, assigned_asc_id,
    // assigned_tech_id, call_type, call_source, caller_type, preferred_language, caller_mobile_no,
    // remark, visit_date, status_id, sub_status_id, created_at, updated_at, visit_time
    const callData = {
      customer_id: Number(customer_id),
      customer_product_id: customer_product_id ? Number(customer_product_id) : null,
      call_type: 'complaint',
      call_source: 'phone',
      caller_type: 'customer',
      status_id: statusId === null ? null : Number(statusId),
      sub_status_id: subStatusId === null ? null : Number(subStatusId),
      remark: String(remark).trim(),
      visit_date: parsedVisitDate,
      visit_time: visit_time ? String(visit_time).trim() : null,
      assigned_asc_id: assigned_asc_id ? Number(assigned_asc_id) : null,
      assigned_tech_id: null,
      preferred_language: null,
      caller_mobile_no: null
      // NOTE: customer_remark, cancel_reason, cancelled_by, etc. don't exist in DB
    };

    console.log('📌 Prepared call data for insert:');
    console.log(`   customer_id: ${callData.customer_id}`);
    console.log(`   customer_product_id: ${callData.customer_product_id}`);
    console.log(`   call_type: ${callData.call_type}`);
    console.log(`   call_source: ${callData.call_source}`);
    console.log(`   caller_type: ${callData.caller_type}`);
    console.log(`   status_id: ${callData.status_id}`);
    console.log(`   sub_status_id: ${callData.sub_status_id}`);
    console.log(`   remark: ${callData.remark.substring(0, 50)}`);
    console.log(`   visit_date: ${callData.visit_date}`);
    console.log(`   visit_time: ${callData.visit_time}`);
    console.log(`   assigned_asc_id: ${callData.assigned_asc_id || 'NULL'}`);
    
    // Verify ASC ID is valid if provided
    if (callData.assigned_asc_id) {
      console.log(`🔍 Verifying Service Center (ASC) with ID: ${callData.assigned_asc_id}...`);
      const ascExists = await ServiceCenter.findByPk(callData.assigned_asc_id, { raw: true });
      if (ascExists) {
        console.log(`✅ Service Center found: ${ascExists.asc_name} (${ascExists.asc_code})`);
      } else {
        console.warn(`⚠️ Service Center with ID ${callData.assigned_asc_id} not found - will still insert but may cause issues`);
      }
    }

    // Create the call record using direct Calls.create for better reliability
    console.log('💾 Creating call record in database...');
    
    try {
      // Use Sequelize create which is more reliable than raw SQL
      const call = await Calls.create({
        customer_id: callData.customer_id,
        customer_product_id: callData.customer_product_id,
        assigned_asc_id: callData.assigned_asc_id,
        assigned_tech_id: callData.assigned_tech_id,
        call_type: callData.call_type,
        call_source: callData.call_source,
        caller_type: callData.caller_type,
        preferred_language: callData.preferred_language,
        caller_mobile_no: callData.caller_mobile_no,
        remark: callData.remark,
        visit_date: callData.visit_date,
        visit_time: callData.visit_time,
        status_id: callData.status_id,
        sub_status_id: callData.sub_status_id
      });

      console.log(`✅ Call record created: ID=${call.call_id}, Customer=${call.customer_id}`);

      // Create action log entry for call creation
      try {
        await ActionLog.create({
          entity_type: 'Call',
          entity_id: call.call_id,
          user_id: callData.created_by || 1, // Use created_by if available, else system user
          action_user_role_id: null,
          old_status_id: null,
          new_status_id: call.status_id || null,
          old_substatus_id: null,
          new_substatus_id: call.sub_status_id || null,
          remarks: `Call created via ${callData.call_source || 'unknown'} for customer ${callData.customer_id}`,
          action_at: call.created_at
        });
        console.log(`✅ Action log created for call ${call.call_id}`);
      } catch (logErr) {
        console.warn(`⚠️ Failed to create action log for call ${call.call_id}:`, logErr.message);
        // Don't fail the call creation if action log fails
      }

      // If service center was assigned during call creation, log that as well
      if (callData.assigned_asc_id) {
        try {
          const scTime = new Date(call.created_at);
          scTime.setSeconds(scTime.getSeconds() + 5); // 5 seconds after call creation
          
          // Get service center name
          const sc = await ServiceCenter.findByPk(callData.assigned_asc_id);
          const scName = sc ? sc.asc_name : 'Unknown';
          
          await ActionLog.create({
            entity_type: 'Call',
            entity_id: call.call_id,
            user_id: callData.created_by || 1,
            action_user_role_id: null,
            old_status_id: null,
            new_status_id: call.status_id || null,
            old_substatus_id: null,
            new_substatus_id: call.sub_status_id || null,
            remarks: `Assigned to Service Center: ${scName}`,
            action_at: scTime
          });
          console.log(`✅ Action log created for service center assignment to call ${call.call_id}`);
        } catch (logErr) {
          console.warn(`⚠️ Failed to create action log for service center assignment:`, logErr.message);
          // Don't fail if action log fails
        }
      }

      // Fetch customer details to include in response
      const customerDetails = await Customer.findByPk(call.customer_id, {
        attributes: [
          'customer_id', 'name', 'mobile_no', 'alt_mob_no', 'email',
          'house_no', 'street_name', 'building_name', 'area', 'landmark',
          'city_id', 'state_id', 'pincode', 'customer_code', 'customer_priority'
        ],
        raw: true
      });

      // Return the created call with customer details
      return res.status(201).json({
        success: true,
        message: 'Complaint registered successfully',
        call: {
          call_id: call.call_id,
          customer_id: call.customer_id,
          customer_product_id: call.customer_product_id,
          call_type: call.call_type,
          status_id: call.status_id,
          sub_status_id: call.sub_status_id,
          visit_date: call.visit_date,
          visit_time: call.visit_time,
          assigned_asc_id: call.assigned_asc_id,
          created_at: call.createdAt
        },
        customer: customerDetails ? {
          customer_id: customerDetails.customer_id,
          name: customerDetails.name,
          mobile_no: customerDetails.mobile_no,
          alt_mob_no: customerDetails.alt_mob_no,
          email: customerDetails.email,
          address: {
            house_no: customerDetails.house_no,
            street_name: customerDetails.street_name,
            building_name: customerDetails.building_name,
            area: customerDetails.area,
            landmark: customerDetails.landmark,
            city_id: customerDetails.city_id,
            state_id: customerDetails.state_id,
            pincode: customerDetails.pincode ? String(customerDetails.pincode).trim() : null
          },
          customer_code: customerDetails.customer_code,
          priority: customerDetails.customer_priority
        } : null
      });

    } catch (createErr) {
      console.error('❌ Error creating call via Sequelize:', createErr.message);
      
      // Fallback: Try raw SQL INSERT and fetch the latest record
      console.log('🔄 Attempting fallback: Using raw SQL INSERT');
      
      try {
        const now = new Date().toISOString();
        
        // Use raw SQL without OUTPUT clause, then fetch the record
        const insertQuery = `
          INSERT INTO [calls] (
            [customer_id],
            [customer_product_id],
            [assigned_asc_id],
            [assigned_tech_id],
            [call_type],
            [call_source],
            [caller_type],
            [preferred_language],
            [caller_mobile_no],
            [remark],
            [visit_date],
            [visit_time],
            [status_id],
            [sub_status_id],
            [created_at],
            [updated_at]
          )
          VALUES (
            @customer_id,
            @customer_product_id,
            @assigned_asc_id,
            @assigned_tech_id,
            @call_type,
            @call_source,
            @caller_type,
            @preferred_language,
            @caller_mobile_no,
            @remark,
            @visit_date,
            @visit_time,
            @status_id,
            @sub_status_id,
            @created_at,
            @updated_at
          )
        `;

        await Calls.sequelize.query(insertQuery, {
          replacements: [
            callData.customer_id,
            callData.customer_product_id,
            callData.assigned_asc_id,
            callData.assigned_tech_id,
            callData.call_type,
            callData.call_source,
            callData.caller_type,
            callData.preferred_language,
            callData.caller_mobile_no,
            callData.remark,
            callData.visit_date,
            callData.visit_time,
            callData.status_id,
            callData.sub_status_id,
            now,
            now
          ],
          type: Calls.sequelize.QueryTypes.INSERT,
          raw: true
        });

        // Now fetch the latest call record for this customer
        console.log('📍 Fetching newly created call record...');
        const call = await Calls.findOne({
          where: { customer_id: callData.customer_id },
          order: [['call_id', 'DESC']],
          attributes: ['call_id', 'customer_id', 'customer_product_id', 'call_type', 'status_id', 'visit_date', 'visit_time', 'assigned_asc_id', 'createdAt'],
          raw: true
        });

        if (!call || !call.call_id) {
          throw new Error('Failed to retrieve created call record');
        }

        console.log(`✅ Call record created (via fallback): ID=${call.call_id}, Customer=${call.customer_id}`);

        // Fetch customer details to include in response
        const customerDetails = await Customer.findByPk(call.customer_id, {
          attributes: [
            'customer_id', 'name', 'mobile_no', 'alt_mob_no', 'email',
            'house_no', 'street_name', 'building_name', 'area', 'landmark',
            'city_id', 'state_id', 'pincode', 'customer_code', 'customer_priority'
          ],
          raw: true
        });

        return res.status(201).json({
          success: true,
          message: 'Complaint registered successfully',
          call: {
            call_id: call.call_id,
            customer_id: call.customer_id,
            customer_product_id: call.customer_product_id,
            call_type: call.call_type,
            status_id: call.status_id,
            sub_status_id: call.sub_status_id,
            visit_date: call.visit_date,
            visit_time: call.visit_time,
            assigned_asc_id: call.assigned_asc_id,
            created_at: call.createdAt
          },
          customer: customerDetails ? {
            customer_id: customerDetails.customer_id,
            name: customerDetails.name,
            mobile_no: customerDetails.mobile_no,
            alt_mob_no: customerDetails.alt_mob_no,
            email: customerDetails.email,
            address: {
              house_no: customerDetails.house_no,
              street_name: customerDetails.street_name,
              building_name: customerDetails.building_name,
              area: customerDetails.area,
              landmark: customerDetails.landmark,
              city_id: customerDetails.city_id,
              state_id: customerDetails.state_id,
              pincode: customerDetails.pincode ? String(customerDetails.pincode).trim() : null
            },
            customer_code: customerDetails.customer_code,
            priority: customerDetails.customer_priority
          } : null
        });

      } catch (fallbackErr) {
        console.error('❌ Fallback also failed:', fallbackErr.message);
        throw fallbackErr;
      }
    }

  } catch (err) {
    console.error('❌ Error registering complaint:', err.message);
    console.error('Error name:', err.name);
    console.error('Error code:', err.code);
    
    // Extract error message from various locations
    let errorDetail = err.message || 'Unknown error';
    if (err.original) {
      if (typeof err.original === 'string') {
        errorDetail = err.original;
      } else if (err.original.message) {
        errorDetail = err.original.message;
      } else {
        errorDetail = JSON.stringify(err.original);
      }
    }
    
    console.error('📋 Full error object:', {
      message: err.message,
      name: err.name,
      code: err.code,
      sql: err.sql,
      parent: err.parent?.message || 'none',
      original: errorDetail,
      stack: err.stack.split('\n')[0]
    });
    
    // Handle specific database errors
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      console.error('🔗 Foreign key constraint error');
      return res.status(400).json({ 
        success: false,
        error: '🔗 Foreign key constraint: Referenced ID does not exist',
        details: errorDetail,
        field: err.fields
      });
    }

    if (err.name === 'SequelizeValidationError') {
      console.error('✓ Validation error');
      const errors = err.errors.map(e => ({ field: e.path, message: e.message }));
      return res.status(400).json({
        success: false,
        error: '✓ Validation error',
        errors: errors,
        details: errorDetail
      });
    }

    if (err.name === 'SequelizeDatabaseError') {
      console.error('🗄️ Database error:', errorDetail);
      return res.status(400).json({
        success: false,
        error: '🗄️ Database error: ' + errorDetail,
        details: errorDetail
      });
    }

    // Generic error response
    console.error('🔴 Generic error caught');
    return res.status(500).json({ 
      success: false,
      error: 'Failed to register complaint: ' + (errorDetail || err.message),
      details: errorDetail || err.message
    });
  }
};

/**
 * Full workflow: Handle complete complaint cycle in single API call
 * Lookup or create customer -> Add product -> Register complaint
 */
export const processComplaint = async (req, res) => {
  try {
    const { 
      mobile_no, customer_name, email, house_no, street_name, building_name, area, landmark,
      product_id, model_id, serial_no, date_of_purchase,
      remark, visit_date, visit_time, assigned_asc_id, created_by,
      city_id, state_id, pincode
    } = req.body;

    // Validate required fields
    if (!mobile_no || !mobile_no.trim()) {
      return res.status(400).json({ 
        error: 'Mobile number is required',
        field: 'mobile_no'
      });
    }

    if (!product_id) {
      return res.status(400).json({ 
        error: 'Product ID is required',
        field: 'product_id'
      });
    }

    if (!remark || !remark.trim()) {
      return res.status(400).json({ 
        error: 'Complaint description is required',
        field: 'remark'
      });
    }

    // Step 1: Lookup or create customer
    let customer = await Customer.findOne({ where: { mobile_no: mobile_no.trim() } });
    
    if (!customer) {
      if (!customer_name || !customer_name.trim()) {
        return res.status(400).json({ 
          error: 'Customer name required for new customer registration',
          field: 'customer_name'
        });
      }
      
      customer = await Customer.create({
        name: customer_name.trim(),
        mobile_no: mobile_no.trim(),
        email: email ? email.trim() : null,
        house_no: house_no || null,
        street_name: street_name || null,
        building_name: building_name || null,
        area: area || null,
        landmark: landmark || null,
        city_id: city_id || null,
        state_id: state_id || null,
        pincode: pincode || null,
        created_by: created_by || null,
        customer_code: `CUST-${Date.now()}`,
        customer_priority: 'medium'
      });
    }

    // Step 2: Add product to customer (if serial_no provided)
    let customerProduct = null;
    if (serial_no && serial_no.trim()) {
      // Check for existing product
      customerProduct = await CustomersProducts.findOne({
        where: { serial_no: serial_no.trim() }
      });

      if (!customerProduct) {
        // Validate product exists
        const product = await Product.findByPk(product_id);
        if (!product) {
          return res.status(404).json({ 
            error: 'Product not found',
            field: 'product_id'
          });
        }

        customerProduct = await CustomersProducts.create({
          customer_id: customer.customer_id,
          product_id,
          model_id: model_id || null,
          serial_no: serial_no.trim(),
          date_of_purchase: date_of_purchase || new Date(),
          warranty_status: 'active',
          qty_with_customer: 1,
          created_by: created_by || null
        });
      }
    }

    // Step 3: Register complaint/call
    const initialStatus = await Status.findOne({ where: { status_name: 'open' } });
    const statusId = initialStatus?.status_id || 1;

    const call = await Calls.create({
      customer_id: customer.customer_id,
      customer_product_id: customerProduct?.customers_products_id || null,
      call_type: 'complaint',
      call_source: 'phone',
      caller_type: 'customer',
      status_id: statusId,
      remark: remark.trim(),
      visit_date: visit_date || null,
      visit_time: visit_time || null,
      assigned_asc_id: assigned_asc_id || null,
      created_by: created_by || null,
      created_at: new Date()
    });

    // Return unified success response
    res.status(201).json({
      success: true,
      message: 'Complaint processed successfully',
      data: {
        customer: {
          customer_id: customer.customer_id,
          name: customer.name,
          mobile_no: customer.mobile_no,
          email: customer.email
        },
        product: customerProduct ? {
          customers_products_id: customerProduct.customers_products_id,
          product_id: customerProduct.product_id,
          serial_no: customerProduct.serial_no
        } : null,
        complaint: {
          call_id: call.call_id,
          call_type: call.call_type,
          status_id: call.status_id,
          created_at: call.created_at
        }
      }
    });
  } catch (err) {
    console.error('Error processing complaint:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process complaint',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Update existing customer details
 */
export const updateCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { 
      name, alt_mob_no, email, 
      house_no, street_name, building_name, area, landmark,
      state_id, city_id, pincode
    } = req.body;

    // Validate customer exists
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ 
        error: 'Customer not found',
        field: 'customer_id'
      });
    }

    // Validate required field
    if (name && !name.trim()) {
      return res.status(400).json({ 
        error: 'Customer name cannot be empty',
        field: 'name'
      });
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format',
        field: 'email'
      });
    }

    // Update customer
    const updated = await customer.update({
      name: name?.trim() || customer.name,
      alt_mob_no: alt_mob_no?.trim() || null,
      email: email?.trim() || null,
      house_no: house_no?.trim() || null,
      street_name: street_name?.trim() || null,
      building_name: building_name?.trim() || null,
      area: area?.trim() || null,
      landmark: landmark?.trim() || null,
      city_id: city_id || null,
      state_id: state_id || null,
      pincode: pincode?.trim() || null
    });

    // Return updated customer
    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      customer: {
        customer_id: updated.customer_id,
        name: updated.name,
        mobile_no: updated.mobile_no,
        alt_mob_no: updated.alt_mob_no,
        email: updated.email,
        address: {
          house_no: updated.house_no,
          street_name: updated.street_name,
          building_name: updated.building_name,
          area: updated.area,
          landmark: updated.landmark,
          city_id: updated.city_id,
          state_id: updated.state_id,
          pincode: updated.pincode
        },
        customer_code: updated.customer_code,
        priority: updated.customer_priority
      }
    });
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update customer',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Get service centers that serve a specific pincode
 * GET /api/call-center/service-centers/pincode/:pincode
 */
export const getServiceCentersByPincode = async (req, res) => {
  try {
    const { pincode } = req.params;

    console.log(`\n📍 Service Center Search for Pincode: ${pincode}`);

    if (!pincode || pincode.trim() === '') {
      return res.status(400).json({
        error: 'Pincode is required',
        serviceCenters: []
      });
    }

    // Trim the pincode for consistent matching
    const trimmedPincode = pincode.trim();

    // Find service center pincodes for this pincode (no include - just raw data)
    console.log(`🔍 Querying ServiceCenterPincodes with pincode: ${trimmedPincode}`);
    
    const serviceCenterPincodes = await ServiceCenterPincodes.findAll({
      where: { serviceable_pincode: trimmedPincode },
      attributes: ['id', 'asc_id', 'serviceable_pincode', 'location_type', 'two_way_distance'],
      raw: true
    });

    console.log(`✓ Found ${serviceCenterPincodes ? serviceCenterPincodes.length : 0} records for pincode ${trimmedPincode}`);

    if (!serviceCenterPincodes || serviceCenterPincodes.length === 0) {
      console.log(`⚠️ No service centers found for pincode: ${trimmedPincode}`);
      return res.status(404).json({
        error: 'No service centers found for this pincode',
        serviceCenters: []
      });
    }

    // Get the ASC IDs from the pincode records
    const ascIds = serviceCenterPincodes.map(scp => scp.asc_id);
    console.log(`🔍 Fetching service center details for ASC IDs: ${ascIds.join(', ')}`);
    
    // Fetch service center details separately
    const serviceCenterDetails = await ServiceCenter.findAll({
      where: { asc_id: ascIds },
      attributes: ['asc_id', 'asc_name', 'asc_code'],
      raw: true
    });

    // Create a map of service center details
    const scMap = {};
    serviceCenterDetails.forEach(sc => {
      scMap[sc.asc_id] = sc;
    });

    // Merge the data
    const serviceCenters = serviceCenterPincodes.map(scp => {
      const scDetails = scMap[scp.asc_id] || {};
      return {
        asc_id: scp.asc_id,
        asc_name: scDetails.asc_name || 'Unknown Service Center',
        asc_code: scDetails.asc_code || 'N/A',
        location_type: scp.location_type || 'local',
        two_way_distance: scp.two_way_distance || 0
      };
    });

    console.log(`✓ Returning ${serviceCenters.length} formatted service centers`);
    console.log(`✓ Service Centers:`, JSON.stringify(serviceCenters, null, 2));

    res.status(200).json({
      success: true,
      serviceCenters
    });
  } catch (err) {
    console.error('❌ Error fetching service centers by pincode:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service centers',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      serviceCenters: []
    });
  }
};

/**
 * Assign complaint to service center
 * POST /api/call-center/complaint/assign-asc
 */
export const assignComplaintToASC = async (req, res) => {
  try {
    const { call_id, asc_id, assigned_by } = req.body;

    // Validate required fields
    if (!call_id) {
      return res.status(400).json({
        error: 'call_id is required'
      });
    }

    if (!asc_id) {
      return res.status(400).json({
        error: 'asc_id (Service Center ID) is required'
      });
    }

    // Verify complaint exists
    const complaint = await Calls.findByPk(call_id);
    if (!complaint) {
      return res.status(404).json({
        error: 'Complaint not found'
      });
    }

    // Verify service center exists
    const serviceCenter = await ServiceCenter.findByPk(asc_id);
    if (!serviceCenter) {
      return res.status(404).json({
        error: 'Service center not found'
      });
    }

    // Get "open" status and "assigned to the service center" sub-status
    let openStatusId = complaint.status_id; // Keep existing status
    let subStatusId = null;
    
    try {
      const openStatus = await Status.findOne({
        where: Calls.sequelize.where(
          Calls.sequelize.fn('LOWER', Calls.sequelize.col('status_name')),
          Calls.sequelize.Op.like,
          '%open%'
        )
      });
      
      if (openStatus) {
        openStatusId = openStatus.status_id;
        
        // Get sub-status "assigned to the service center"
        const subStatus = await SubStatus.findOne({
          where: {
            status_id: openStatusId,
            ...Calls.sequelize.where(
              Calls.sequelize.fn('LOWER', Calls.sequelize.col('sub_status_name')),
              Calls.sequelize.Op.eq,
              'assigned to the service center'
            )
          }
        });
        
        if (subStatus) {
          subStatusId = subStatus.sub_status_id;
        }
      }
    } catch (err) {
      console.warn('⚠️ Error getting status/sub-status:', err.message);
    }

    // Update complaint with assigned service center and sub-status
    await Calls.update(
      { 
        assigned_asc_id: asc_id,
        status_id: openStatusId,
        sub_status_id: subStatusId
      },
      { where: { call_id } }
    );

    // Fetch updated complaint details
    const updatedComplaint = await Calls.findByPk(call_id, {
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['customer_id', 'name', 'mobile_no', 'pincode']
        },
        {
          model: ServiceCenter,
          as: 'serviceCenter',
          attributes: ['asc_id', 'asc_name', 'asc_code']
        },
        {
          model: Status,
          as: 'status',
          attributes: ['status_id', 'status_name']
        },
        {
          model: SubStatus,
          as: 'subStatus',
          attributes: ['sub_status_id', 'sub_status_name']
        }
      ],
      attributes: [
        'call_id', 'customer_id', 'assigned_asc_id', 'remark',
        'visit_date', 'visit_time', 'status_id', 'sub_status_id', 'created_at'
      ]
    });

    // Create action log entry for service center assignment
    try {
      const now = new Date();
      await ActionLog.create({
        entity_type: 'Call',
        entity_id: call_id,
        user_id: assigned_by || 1,
        action_user_role_id: null,
        old_status_id: complaint.status_id || null,
        new_status_id: openStatusId || null,
        old_substatus_id: complaint.sub_status_id || null,
        new_substatus_id: subStatusId || null,
        remarks: `Assigned to Service Center: ${serviceCenter.asc_name || 'Unknown'}`,
        action_at: now
      });
      console.log(`✅ Action log created for service center assignment to call ${call_id}`);
    } catch (logErr) {
      console.warn(`⚠️ Failed to create action log for service center assignment:`, logErr.message);
      // Don't fail the assignment if action log fails
    }

    res.status(200).json({
      success: true,
      message: 'Complaint assigned to service center successfully',
      call: {
        call_id: updatedComplaint.call_id,
        customer_id: updatedComplaint.customer_id,
        assigned_asc_id: updatedComplaint.assigned_asc_id,
        status: updatedComplaint.status ? {
          status_id: updatedComplaint.status.status_id,
          status_name: updatedComplaint.status.status_name
        } : null,
        subStatus: updatedComplaint.subStatus ? {
          sub_status_id: updatedComplaint.subStatus.sub_status_id,
          sub_status_name: updatedComplaint.subStatus.sub_status_name
        } : null,
        service_center: updatedComplaint.serviceCenter ? {
          asc_id: updatedComplaint.serviceCenter.asc_id,
          asc_name: updatedComplaint.serviceCenter.asc_name,
          asc_code: updatedComplaint.serviceCenter.asc_code
        } : null,
        visit_date: updatedComplaint.visit_date,
        visit_time: updatedComplaint.visit_time
      }
    });
  } catch (err) {
    console.error('Error assigning complaint to service center:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to assign complaint to service center',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
/**
 * Get complaints for a specific service center
 * GET /api/call-center/complaints/by-service-center/:ascId
 */
export const getComplaintsByServiceCenter = async (req, res) => {
  try {
    const { ascId } = req.params;

    if (!ascId) {
      return res.status(400).json({
        error: 'Service Center ID is required',
        complaints: []
      });
    }

    // Get all calls assigned to this service center
    const complaints = await Calls.findAll({
      where: { assigned_asc_id: parseInt(ascId) },
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

    // Normalize response keys to match frontend expectations (same as /api/complaints)
    const sequelize = Calls.sequelize;
    
    // For each complaint, get the status name from database if association failed
    const mappedComplaints = await Promise.all(complaints.map(async (c) => {
      // Get technician name from the associated Technicians table
      let technicianName = '';
      if (c.assigned_tech_id && c.technician) {
        technicianName = c.technician.name || '';
        console.log(`✅ Service Center ${ascId} - Call ${c.call_id}: Tech ID ${c.assigned_tech_id} → Name: ${technicianName}`);
      } else if (c.assigned_tech_id) {
        console.log(`⚠️  Service Center ${ascId} - Call ${c.call_id}: Has Tech ID ${c.assigned_tech_id} but no technician association!`);
      }
      
      // Get status name - check association first, then query database if needed
      let statusName = '';
      if (c.status && c.status.status_name) {
        statusName = c.status.status_name;
      } else if (c.status_id) {
        // Query database to get status name
        try {
          const statusResult = await sequelize.query(
            'SELECT TOP 1 status_name FROM status WHERE status_id = ?',
            { replacements: [c.status_id], type: sequelize.QueryTypes.SELECT }
          );
          statusName = statusResult && statusResult[0] ? statusResult[0].status_name : 'Unknown';
        } catch (err) {
          console.error(`⚠️  Error fetching status for call ${c.call_id}:`, err.message);
          statusName = 'Unknown';
        }
      } else {
        statusName = c.call_type || 'Open';
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
        CallStatus: statusName,
        StatusId: c.status_id,
        AssignedCenterId: c.assigned_asc_id,
        AssignedTechnicianId: c.assigned_tech_id,
        TechnicianName: technicianName,
        ServiceCenterName: c.serviceCenter ? c.serviceCenter.asc_name : '',
        CreatedAt: c.created_at,
        UpdatedAt: c.updated_at,
        Product: c.customer_product_id ? (c.customer_product ? c.customer_product.product_name : '') : '',
        Model: c.customer_product_id ? (c.customer_product ? c.customer_product.model_name : '') : '',
        ProductSerialNo: c.customer_product_id ? (c.customer_product ? c.customer_product.serial_number : '') : ''
      };
    }));

    res.status(200).json({
      success: true,
      totalComplaints: mappedComplaints.length,
      complaints: mappedComplaints
    });
  } catch (err) {
    console.error('Error fetching complaints for service center:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaints',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      complaints: []
    });
  }
};

/**
 * Get status and sub-status history for a call
 * GET /api/call-center/complaint/:callId/status-history
 */
export const getCallStatusHistory = async (req, res) => {
  try {
    const { callId } = req.params;

    // Validate required fields
    if (!callId) {
      return res.status(400).json({
        error: 'callId is required'
      });
    }

    // Verify call exists
    const call = await Calls.findByPk(callId, {
      include: [
        {
          model: Status,
          as: 'status',
          attributes: ['status_id', 'status_name']
        },
        {
          model: SubStatus,
          as: 'subStatus',
          attributes: ['sub_status_id', 'sub_status_name']
        }
      ]
    });

    if (!call) {
      return res.status(404).json({
        error: 'Call not found'
      });
    }

    // Get status history from ActionLog with status names using raw SQL join
    const sequelize = Calls.sequelize;
    const history = await sequelize.query(
      `SELECT 
        al.log_id,
        al.entity_type,
        al.entity_id,
        al.user_id,
        u.username,
        u.email,
        al.old_status_id,
        os.status_name as old_status_name,
        al.new_status_id,
        ns.status_name as new_status_name,
        al.remarks,
        al.action_at
       FROM action_logs al
       LEFT JOIN users u ON al.user_id = u.user_id
       LEFT JOIN status os ON al.old_status_id = os.status_id
       LEFT JOIN status ns ON al.new_status_id = ns.status_id
       WHERE al.entity_type = 'Call' AND al.entity_id = ?
       ORDER BY al.action_at ASC`,
      { 
        replacements: [callId],
        type: sequelize.QueryTypes.SELECT 
      }
    );

    // Format response
    const statusSequence = history.map(log => ({
      logId: log.log_id,
      timestamp: log.action_at,
      remarks: log.remarks,
      user: log.username ? {
        userId: log.user_id,
        username: log.username,
        email: log.email
      } : null,
      oldStatus: log.old_status_id ? {
        statusId: log.old_status_id,
        statusName: log.old_status_name
      } : null,
      newStatus: log.new_status_id ? {
        statusId: log.new_status_id,
        statusName: log.new_status_name
      } : null
    }));

    res.status(200).json({
      success: true,
      callId,
      currentStatus: call.status ? {
        statusId: call.status.status_id,
        statusName: call.status.status_name
      } : null,
      currentSubStatus: call.subStatus ? {
        subStatusId: call.subStatus.sub_status_id,
        subStatusName: call.subStatus.sub_status_name
      } : null,
      statusHistory: statusSequence
    });
  } catch (err) {
    console.error('Error fetching call status history:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch status history',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Get current status for a call
 * GET /api/call-center/complaint/:callId/status
 */
export const getCallCurrentStatus = async (req, res) => {
  try {
    const { callId } = req.params;

    // Validate required fields
    if (!callId) {
      return res.status(400).json({
        error: 'callId is required'
      });
    }

    // Get call with status details
    const call = await Calls.findByPk(callId, {
      include: [
        {
          model: Status,
          as: 'status',
          attributes: ['status_id', 'status_name']
        },
        {
          model: SubStatus,
          as: 'subStatus',
          attributes: ['sub_status_id', 'sub_status_name']
        }
      ]
    });

    if (!call) {
      return res.status(404).json({
        error: 'Call not found'
      });
    }

    res.status(200).json({
      success: true,
      callId,
      status: call.status ? {
        statusId: call.status.status_id,
        statusName: call.status.status_name
      } : null,
      subStatus: call.subStatus ? {
        subStatusId: call.subStatus.sub_status_id,
        subStatusName: call.subStatus.sub_status_name
      } : null
    });
  } catch (err) {
    console.error('Error fetching call status:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch status',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};