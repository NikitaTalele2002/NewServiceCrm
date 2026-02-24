const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJTQ1VzZXIiLCJjZW50ZXJJZCI6NCwicm9sZSI6InNlcnZpY2VfY2VudGVyIiwiaWF0IjoxNzcxMjM1NjU2fQ.oxbba2nqMYdAjWQmJK95SFbKzOf8a6l9AkEdFGFAx5s';
const API_BASE = 'http://localhost:5000/api';

const getToken = () => {
  let token = localStorage.getItem('token');
  if (!token) {
    console.warn('⚠️ No token, using test token for SC 4');
    token = TEST_TOKEN;
  }
  return token;
};

export const rentalAllocationApi = {
  // Fetch spare requests with optional filters
  fetchRequests: async (filters = {}) => {
    try {
      const token = getToken();
      const apiUrl = `${API_BASE}/technician-sc-spare-requests/rental-allocation`;
      console.log('📡 Fetching technician spare requests from:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ API Response:', data);

      // Return data in expected format with items
      return data.data || [];
    } catch (error) {
      console.error('❌ Error fetching requests:', error);
      return [];
    }
  },

  // Fetch request details by ID
  fetchRequestDetails: async (requestId) => {
    try {
      const token = getToken();
      const apiUrl = `${API_BASE}/technician-sc-spare-requests/${requestId}`;
      console.log('📡 Fetching request details:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch request details');
      const data = await response.json();
      console.log('✅ Request details:', data);
      return data.data || data;
    } catch (error) {
      console.error('Error fetching details:', error);
      throw error;
    }
  },

  // Check availability of spare parts
  checkSpareAvailability: async (sku) => {
    try {
      const token = getToken();
      const apiUrl = `${API_BASE}/spare-requests/spare-parts/${sku}/availability`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to check availability');
      return await response.json();
    } catch (error) {
      // Silently fail and return 0 availability
      return { available: 0 };
    }
  },

  // Approve spare parts
  approveSpareParts: async (requestId, approvalData) => {
    try {
      const token = getToken();
      const apiUrl = `${API_BASE}/technician-sc-spare-requests/${requestId}/approve`;
      console.log('📤 Approving request to:', apiUrl);
      console.log('📋 Approval data:', JSON.stringify(approvalData, null, 2));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(approvalData)
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('❌ Approval failed:', response.status, responseData);
        const errorMsg = responseData.details || responseData.error || 'Unknown error';
        throw new Error(`Approval failed (${response.status}): ${errorMsg}`);
      }
      
      console.log('✅ Approval response:', responseData);
      return responseData;
    } catch (error) {
      console.error('❌ Error approving:', error.message);
      throw error;
    }
  },

  // Reject spare request
  rejectSpareRequest: async (requestId, rejectionReason) => {
    try {
      const token = getToken();
      const apiUrl = `${API_BASE}/technician-sc-spare-requests/${requestId}/reject`;
      console.log('📤 Rejecting request:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: rejectionReason })
      });

      if (!response.ok) throw new Error('Rejection failed');
      const data = await response.json();
      console.log('✅ Rejection response:', data);
      return data;
    } catch (error) {
      console.error('Error rejecting:', error);
      throw error;
    }
  },

  // Fetch allocated requests (approved only)
  fetchAllocatedRequests: async () => {
    try {
      const token = getToken();
      const apiUrl = `${API_BASE}/technician-sc-spare-requests/rental-allocation`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch allocated requests');
      const data = await response.json();
      return (data.data || []).filter(r => r.status === 'approved');
    } catch (error) {
      console.error('Error fetching allocated requests:', error);
      return [];
    }
  },

  // Fetch technician inventory
  fetchTechnicianInventory: async (technicianId) => {
    try {
      const token = getToken();
      const apiUrl = `${API_BASE}/spare-requests/technicians/${technicianId}/inventory`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch technician inventory');
      return await response.json();
    } catch (error) {
      console.error('Error fetching technician inventory:', error);
      return [];
    }
  },

  // Return spare parts
  returnSpareParts: async (returnItems) => {
    try {
      const token = getToken();
      const apiUrl = `${API_BASE}/spare-requests/return`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ returns: returnItems })
      });

      if (!response.ok) throw new Error('Return failed');
      return await response.json();
    } catch (error) {
      console.error('Error returning parts:', error);
      throw error;
    }
  }
};