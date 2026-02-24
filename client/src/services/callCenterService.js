/**
 * Call Center API Service
 * Handles all API calls for the call center workflow
 */

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

/**
 * Get authorization token from localStorage
 */
const getAuthHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/**
 * Get current logged-in user from localStorage
 */
const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : {};
};

/**
 * Login user with credentials
 */
export const loginUser = async (userId, password) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: userId, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Login failed");
  }

  const data = await res.json();
  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify({
      username: data.username,
      userId: data.id || userId,
      role: data.role
    }));
  }
  return data;
};

/**
 * Search customer by mobile number
 */
export const searchCustomerByMobile = async (mobileNo) => {
  const res = await fetch(`${API_BASE}/call-center/customer/${mobileNo}`, {
    headers: getAuthHeader(),
  });

  if (res.status === 404) {
    return null; // Customer not found
  }

  if (!res.ok) {
    throw new Error("Failed to search customer");
  }

  const data = await res.json();
  return data.customer || data; // Handle both response formats
};

/**
 * Register new customer
 */
export const registerNewCustomer = async (formData) => {
  const user = getCurrentUser();
  
  const payload = {
    name: formData.name,
    email: formData.email,
    mobile_no: formData.mobile_no,
    house_no: formData.house_no,
    street_name: formData.street_name,
    building_name: formData.building_name,
    area: formData.area,
    landmark: formData.landmark,
    city_id: formData.city_id,
    state_id: formData.state_id,
    pincode: formData.pincode,
    customer_code: `CUST-${Date.now()}`,
    customer_priority: 'medium',
    created_by: user.userId || user.id,
  };

  const res = await fetch(`${API_BASE}/call-center/customer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Customer registration failed");
  }

  const data = await res.json();
  return data.customer || data;
};

/**
 * Register product for customer
 */
export const registerProductForCustomer = async (customerId, productData) => {
  const user = getCurrentUser();

  const payload = {
    product_id: productData.product_id,
    model_id: productData.model_id,
    serial_no: productData.serial_number,
    date_of_purchase: productData.purchase_date,
    dealer_id: productData.dealer_id || 1,
    created_by: user.userId || user.id,
  };

  const res = await fetch(`${API_BASE}/call-center/customer/${customerId}/product`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Product registration failed");
  }

  const data = await res.json();
  return data.customer_product;
};

/**
 * Register complaint
 */
export const registerComplaint = async (complaintData) => {
  const user = getCurrentUser();

  const payload = {
    customer_id: complaintData.customer_id,
    customer_product_id: complaintData.customer_product_id,
    call_type: complaintData.call_type || 'complaint',
    remark: complaintData.remark || complaintData.complaint_description,
    visit_date: complaintData.visit_date,
    visit_time: complaintData.visit_time,
    // Use the actual service center ID if provided, not the user ID
    assigned_asc_id: complaintData.assigned_asc_id || null,
    created_by: user.userId || user.id,
  };

  const res = await fetch(`${API_BASE}/call-center/complaint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Complaint registration failed");
  }

  return await res.json();
};

/**
 * Register complaint by mobile and serial number (full lookup and create)
 */
export const registerComplaintByMobileAndSerial = async (complaintData) => {
  const user = getCurrentUser();

  try {
    // Step 1: Lookup customer by mobile
    const customer = await searchCustomerByMobile(complaintData.customer_mobile_no);
    if (!customer) {
      return { success: false, error: "Customer not found with this mobile number" };
    }

    // Step 2: Find product by serial number
    let customerId = customer.customer_id;
    let customerProductId = null;

    if (complaintData.customers_product_serial_no && customer.products) {
      const product = customer.products.find(p => p.serial_no === complaintData.customers_product_serial_no);
      if (product) {
        customerProductId = product.customers_products_id;
      }
    }

    // Step 3: Call registerComplaint with resolved IDs
    const complaintPayload = {
      customer_id: customerId,
      customer_product_id: customerProductId,
      call_type: complaintData.call_type || 'complaint',
      remark: complaintData.remark,
      visit_date: complaintData.visit_date,
      visit_time: complaintData.visit_time,
      // Use the actual service center ID if provided, not the user ID
      assigned_asc_id: complaintData.assigned_asc_id || null,
      created_by: user.userId || user.id,
    };

    return await registerComplaint(complaintPayload);
  } catch (err) {
    console.error('Error in complaint workflow:', err);
    return { success: false, error: err.message };
  }
};
