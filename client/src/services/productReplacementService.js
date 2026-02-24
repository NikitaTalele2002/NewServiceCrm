const API_BASE_URL = 'http://localhost:5000/api';

export const productReplacementService = {
  async fetchProductGroups(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching product groups:', error);
      return [];
    }
  },

  async fetchProducts(groupId, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/products/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  },

  async fetchModels(productId, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/models/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  },

  async fetchTechnicians(centerId, token) {
    try {
      const url = centerId ? `${API_BASE_URL}/technicians/by-centre?centerId=${centerId}` : `${API_BASE_URL}/technicians`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        return data.technicians || data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching technicians:', error);
      return [];
    }
  },

  async fetchServiceCenters(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/servicecenter/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching service centers:', error);
      return [];
    }
  },

  async fetchUsers(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  async fetchComplaint(callId, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/complaints/${callId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Complaint not found');
    } catch (error) {
      console.error('Error fetching complaint:', error);
      throw error;
    }
  },

  async fetchSpareRequests(complaintId, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/spare-requests?complaintId=${complaintId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching spare requests:', error);
      return [];
    }
  },

  async submitReplacementRequest(formData, token) {
    try {
      console.log('Submitting replacement request with data:', formData);
      const response = await fetch(`${API_BASE_URL}/spare-requests/replacement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        return await response.json();
      }
      
      // Try to parse as JSON, otherwise return the text
      const contentType = response.headers.get('content-type');
      let errorData;
      
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        const text = await response.text();
        console.error('Backend error response (non-JSON):', text);
        errorData = { message: 'Server error occurred. Check console for details.' };
      }
      
      throw new Error(errorData.message || 'Failed to submit request');
    } catch (error) {
      console.error('Error submitting replacement request:', error);
      throw error;
    }
  },

  async fetchReplacementHistory(filters, pagination, token) {
    try {
      const queryParams = new URLSearchParams({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });

      const url = `${API_BASE_URL}/spare-requests/replacement-history?${queryParams.toString()}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Response data:', result);
        return {
          data: result?.data || result || [],
          pagination: result?.pagination || { page: pagination.page, limit: pagination.limit, total: 0, pages: 0 }
        };
      }
      console.warn('Response not OK, status:', response.status);
      return {
        data: [],
        pagination: { page: pagination.page, limit: pagination.limit, total: 0, pages: 0 }
      };
    } catch (error) {
      console.error('Error fetching replacement history:', error);
      return {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      };
    }
  }
};