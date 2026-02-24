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
    body: JSON.stringify({ userId, password }),
  });

  if (!res.ok) {
    throw new Error("Login failed");
  }

  const data = await res.json();
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
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
 * Backend will auto-generate customer_code and customer_priority
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
    const error = await res.json();
    throw new Error(error.error || "Customer registration failed");
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
    qty_with_customer: productData.qty_with_customer || 1,
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
    const error = await res.json();
    throw new Error(error.error || "Product registration failed");
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
    remark: complaintData.remark || complaintData.complaint_description,
    visit_date: complaintData.visit_date,
    visit_time: complaintData.visit_time,
    assigned_asc_id: complaintData.assigned_asc_id || null,
    created_by: complaintData.created_by !== undefined ? complaintData.created_by : (user.userId || user.id),
  };

  console.log('🔄 Calling complaint registration API with payload:', payload);

  try {
    const res = await fetch(`${API_BASE}/call-center/complaint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    console.log(`📊 API Response Status: ${res.status} ${res.statusText}`);

    let result;
    try {
      result = await res.json();
    } catch (parseErr) {
      console.error('❌ Failed to parse JSON response:', parseErr);
      throw new Error(`Server responded with invalid JSON (Status: ${res.status})`);
    }

    console.log('📥 API Response Body:', result);
    console.log('📥 API Response Body type:', typeof result);
    if (result && typeof result === 'object') {
      console.log('📥 API Response Body keys:', Object.keys(result));
    }

    if (!res.ok) {
      const errorMsg = result?.error || `HTTP ${res.status}`;
      const details = result?.details || result?.message || '';
      const fullMsg = details ? `${errorMsg}: ${details}` : errorMsg;
      
      console.error('❌ API Error:', {
        status: res.status,
        error: errorMsg,
        details: details,
        fullResponse: result
      });
      
      throw new Error(fullMsg);
    }

    // Validate that result has the expected structure
    if (!result || typeof result !== 'object') {
      console.error('❌ Invalid response structure - not an object');
      throw new Error('Server returned an invalid response');
    }

    console.log('✅ API Response Success');
    return result;

  } catch (err) {
    const errorMsg = err.message || 'Unknown error';
    console.error('❌ Complaint registration error:', errorMsg);
    console.error('❌ Error details:', err);
    throw err;
  }
};

/**
 * Process complete complaint workflow in single API call
 * (optional - for streamlined single-step registration)
 */
export const processCompleteWorkflow = async (workflowData) => {
  const user = getCurrentUser();

  const payload = {
    ...workflowData,
    created_by: user.userId || user.id,
  };

  const res = await fetch(`${API_BASE}/call-center/process-complaint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Workflow process failed");
  }

  return await res.json();
};

/**
 * Fetch service centers that can service a specific pincode
 */
export const getServiceCentersByPincode = async (pincode) => {
  const res = await fetch(`${API_BASE}/call-center/service-centers/pincode/${pincode}`, {
    headers: getAuthHeader(),
  });

  if (res.status === 404) {
    return []; // No service centers for this pincode
  }

  if (!res.ok) {
    throw new Error("Failed to fetch service centers");
  }

  const data = await res.json();
  return data.serviceCenters || [];
};

/**
 * Assign complaint to service center
 */
export const assignComplaintToServiceCenter = async (callId, ascId) => {
  const user = getCurrentUser();

  const payload = {
    call_id: callId,
    asc_id: ascId,
    assigned_by: user.userId || user.id,
  };

  const res = await fetch(`${API_BASE}/call-center/complaint/assign-asc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to assign complaint to service center");
  }

  return await res.json();
};
