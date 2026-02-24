const API_BASE = 'http://localhost:5000/api';

/**
 * Fetch all spare return requests for authenticated service center
 * Uses new /api/spare-returns/list endpoint
 */
export const getServiceCenterReturnRequestsApi = async () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('Authentication required. Please log in first.');
  }

  try {
    const response = await fetch(`${API_BASE}/spare-returns/list`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 403) {
      throw new Error('Session expired or invalid token. Please log in again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch return requests');
    }

    const data = await response.json();
    // Return requests array in the expected format
    return data.requests || [];
  } catch (error) {
    if (error.message.includes('Session expired') || error.message.includes('Authentication required')) {
      throw error;
    }
    throw new Error(`Failed to connect to server: ${error.message}`);
  }
};

/**
 * Fetch specific return request details
 * Uses new /api/spare-returns/view/:requestId endpoint
 */
export const getReturnRequestDetailsApi = async (requestId) => {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('Authentication required. Please log in first.');
  }

  try {
    const response = await fetch(`${API_BASE}/spare-returns/view/${requestId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 403) {
      throw new Error('Session expired or invalid token. Please log in again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch return request details');
    }

    const data = await response.json();
    return data.request || data;
  } catch (error) {
    if (error.message.includes('Session expired') || error.message.includes('Authentication required')) {
      throw error;
    }
    throw new Error(`Failed to connect to server: ${error.message}`);
  }
};

/**
 * Fetch challan details for printing
 * Uses new /api/spare-returns/challan/:requestId endpoint
 */
export const getChallanDetailsApi = async (requestId) => {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('Authentication required. Please log in first.');
  }

  try {
    const response = await fetch(`${API_BASE}/spare-returns/challan/${requestId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 403) {
      throw new Error('Session expired or invalid token. Please log in again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch challan details');
    }

    const data = await response.json();
    return data.challan || data;
  } catch (error) {
    if (error.message.includes('Session expired') || error.message.includes('Authentication required')) {
      throw error;
    }
    throw new Error(`Failed to connect to server: ${error.message}`);
  }
};