const API_BASE = 'http://localhost:5000/api';

// Get auth headers from localStorage token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const searchService = {
  // Search customers by various criteria using POST method
  async searchCustomers(searchParams) {
    try {
      // Build payload with only non-empty fields
      const payload = {};
      if (searchParams.mobileNo) payload.mobileNo = searchParams.mobileNo;
      if (searchParams.altMobile) payload.altMobile = searchParams.altMobile;
      if (searchParams.productSerialNo) payload.productSerialNo = searchParams.productSerialNo;
      if (searchParams.customerCode) payload.customerCode = searchParams.customerCode;
      if (searchParams.name) payload.name = searchParams.name;
      if (searchParams.state) payload.state = searchParams.state;
      if (searchParams.city) payload.city = searchParams.city;
      if (searchParams.pincode) payload.pincode = searchParams.pincode;

      const res = await fetch(`${API_BASE}/customers/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const response = await res.json();
      
      // Handle different response formats
      if (Array.isArray(response) && response.length > 0) {
        return { exists: true, customer: response[0] };
      } else if (response?.exists) {
        return response;
      } else {
        return { exists: false };
      }
    } catch (err) {
      console.error('Customer search failed:', err);
      throw new Error('Failed to search customers. Please check your backend connection.');
    }
  },

  // Create new customer if not found
  async createCustomer(customerData) {
    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(customerData),
      });

      if (!res.ok) throw new Error('Failed to create customer');
      return { success: true, data: await res.json() };
    } catch (err) {
      console.error('Customer creation failed:', err);
      return { success: false, error: err.message };
    }
  },
};
