const API_BASE = '/api/spare-requests';

export const rentalReturnService = {
  // Get allocated spare requests
  getAllocatedRequests: async (token) => {
    try {
      const response = await fetch(`${API_BASE}?status=Allocated`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        throw new Error(`HTTP ${response.status}: Failed to fetch allocated requests`);
      }
      
      let data = await response.json();
      // Ensure data is an array
      if (!Array.isArray(data)) {
        data = (data.data || data.requests || []);
      }
      
      // Map response data to expected format
      return data.map(req => ({
        id: req.id,
        requestId: req.requestId,
        status: req.status || 'Allocated',
        technicianName: req.technicianName || 'Unknown',
        technicianId: req.technicianId,
        serviceCenterName: req.serviceCenterName || 'Service Center',
        allocatedDate: req.createdAt || new Date().toISOString(),
        itemCount: (req.items && req.items.length) || 0,
        items: req.items || []
      }));
    } catch (error) {
      console.error('Error in getAllocatedRequests:', error);
      throw error;
    }
  },

  // Get pending return requests (NEW - for service center approval)
  getPendingReturnRequests: async (token) => {
    try {
      console.log('🔍 Fetching pending return requests from /api/spare-requests/returns/pending');
      const response = await fetch(`${API_BASE}/returns/pending`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch pending return requests`);
      }
      
      const data = await response.json();
      console.log(`✅ Received ${data.count || 0} pending return requests`, data.returns);
      
      return data.returns || [];
    } catch (error) {
      console.error('Error fetching pending return requests:', error);
      throw error;
    }
  },

  // Get details of a specific return request
  getReturnRequestDetails: async (requestId, token) => {
    try {
      console.log(`🔍 Fetching return request ${requestId} details`);
      const response = await fetch(`${API_BASE}/returns/${requestId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch return request`);
      }
      
      const data = await response.json();
      console.log('✅ Return request details:', data.return);
      
      return data.return;
    } catch (error) {
      console.error('Error fetching return request details:', error);
      throw error;
    }
  },

  // Approve a pending return request
  approveReturnRequest: async (requestId, token, approvalRemarks = '', approvedQtys = {}) => {
    try {
      console.log(`📋 Approving return request ${requestId}`, { approvalRemarks, approvedQtys });
      const response = await fetch(`${API_BASE}/${requestId}/approve-return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          approvalRemarks,
          approvedQtys
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error response:', errorData);
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: Failed to approve return request`);
      }
      
      const data = await response.json();
      console.log('✅ Return request approved:', data);
      
      return data;
    } catch (error) {
      console.error('Error approving return request:', error);
      throw error;
    }
  },

  // Get technician inventory for a specific technician
  getTechnicianInventory: async (technicianId, token) => {
    console.log(`🔍 Fetching inventory from /api/spare-requests/technicians/${technicianId}/inventory`);
    const response = await fetch(`${API_BASE}/technicians/${technicianId}/inventory`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error response:', errorData);
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch technician inventory`);
    }
    
    const data = await response.json();
    console.log(`📦 Received inventory data:`, data);
    
    return data;
  },

  // Submit rental returns (now creates PENDING request instead of auto-approving)
  submitReturns: async (returns, token, technicianId) => {
    console.log('📤 POST /api/spare-requests/return with data:', {
      returns,
      technicianId
    });
    
    const response = await fetch(`${API_BASE}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ 
        returns,
        technicianId  // Pass technician ID for routing to correct ASC
      })
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error response:', errorData);
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: Return submission failed`);
    }
    
    const data = await response.json();
    console.log('✅ Return response data:', data);
    return data;
  }
};