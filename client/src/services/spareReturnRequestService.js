import { API_BASE } from './config.js';

const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Create a spare return request
 * Technician collects defective spares and remaining goods after field replacement
 */
export const createSpareReturnRequest = async (returnData) => {
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE}/spare-return-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(returnData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create return request');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating return request:', error);
    throw error;
  }
};

/**
 * Get list of return requests for the user's service center
 */
export const getReturnRequests = async (filters = {}) => {
  try {
    const token = getToken();
    const queryParams = new URLSearchParams();

    if (filters.technician_id) queryParams.append('technician_id', filters.technician_id);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.from_date) queryParams.append('from_date', filters.from_date);
    if (filters.to_date) queryParams.append('to_date', filters.to_date);
    if (filters.include_items !== undefined) queryParams.append('include_items', filters.include_items);

    const response = await fetch(`${API_BASE}/spare-return-requests?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch return requests');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching return requests:', error);
    throw error;
  }
};

/**
 * Get return request details
 */
export const getReturnRequestDetails = async (returnRequestId) => {
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE}/spare-return-requests/${returnRequestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch return request details');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching return request details:', error);
    throw error;
  }
};

/**
 * Receive a return request at ASC
 * Creates stock movement from technician to service center
 */
export const receiveReturnRequest = async (returnRequestId, receiveData) => {
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE}/spare-return-requests/${returnRequestId}/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(receiveData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to receive return request');
    }

    return await response.json();
  } catch (error) {
    console.error('Error receiving return request:', error);
    throw error;
  }
};

/**
 * Verify a return request at ASC
 * Final quality check and quantity verification
 */
export const verifyReturnRequest = async (returnRequestId, verifyData) => {
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE}/spare-return-requests/${returnRequestId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(verifyData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to verify return request');
    }

    return await response.json();
  } catch (error) {
    console.error('Error verifying return request:', error);
    throw error;
  }
};

/**
 * Reject a return request
 */
export const rejectReturnRequest = async (returnRequestId, rejectData) => {
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE}/spare-return-requests/${returnRequestId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(rejectData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to reject return request');
    }

    return await response.json();
  } catch (error) {
    console.error('Error rejecting return request:', error);
    throw error;
  }
};

/**
 * Get return summary for a technician
 */
export const getTechnicianReturnSummary = async (technicianId) => {
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE}/spare-return-requests/summary/technician/${technicianId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch technician return summary');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching technician return summary:', error);
    throw error;
  }
};

/**
 * Get technician inventory available for return
 */
export const getTechnicianInventoryForReturn = async (technicianId) => {
  try {
    const token = getToken();
    const response = await fetch(`${API_BASE}/spare-return-requests/technician-inventory/${technicianId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch technician inventory');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching technician inventory:', error);
    throw error;
  }
};

export default {
  createSpareReturnRequest,
  getReturnRequests,
  getReturnRequestDetails,
  receiveReturnRequest,
  verifyReturnRequest,
  rejectReturnRequest,
  getTechnicianReturnSummary,
  getTechnicianInventoryForReturn
};
