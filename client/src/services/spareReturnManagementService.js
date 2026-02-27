/**
 * Spare Return Management Service
 * Handles all spare return request operations including:
 * - Creating returns
 * - Listing returns by status
 * - Receiving returns
 * - Verifying returns
 * - Tracking inventory changes
 */

import { getApiUrl } from '../config/apiConfig';

const API_BASE = getApiUrl('/spare-return-requests');

export const spareReturnManagementService = {
  /**
   * Get all spare return requests
   * @param {string} status - Filter by status: 'pending', 'received', 'verified', 'completed'
   * @param {string} token - Auth token
   */
  getReturnRequests: async (status = 'pending', token) => {
    try {
      const url = status ? `${API_BASE}?status=${status}` : API_BASE;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch return requests');
      return response.json();
    } catch (error) {
      console.error('Error fetching return requests:', error);
      throw error;
    }
  },

  /**
   * Get specific return request details
   * @param {number} requestId - Return request ID
   * @param {string} token - Auth token
   */
  getReturnRequestDetails: async (requestId, token) => {
    try {
      const response = await fetch(`${API_BASE}/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch return request details');
      return response.json();
    } catch (error) {
      console.error('Error fetching return request details:', error);
      throw error;
    }
  },

  /**
   * Receive a return request at service center
   * Creates stock movement and triggers inventory update
   * @param {number} requestId - Return request ID
   * @param {object} receiveData - Items received with quantities
   * @param {string} token - Auth token
   */
  receiveReturn: async (requestId, receiveData, token) => {
    try {
      const response = await fetch(`${API_BASE}/${requestId}/receive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(receiveData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to receive return');
      }
      return response.json();
    } catch (error) {
      console.error('Error receiving return:', error);
      throw error;
    }
  },

  /**
   * Verify a received return at service center
   * @param {number} requestId - Return request ID
   * @param {object} verifyData - Verification information
   * @param {string} token - Auth token
   */
  verifyReturn: async (requestId, verifyData, token) => {
    try {
      const response = await fetch(`${API_BASE}/${requestId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(verifyData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to verify return');
      }
      return response.json();
    } catch (error) {
      console.error('Error verifying return:', error);
      throw error;
    }
  },

  /**
   * Reject a return request
   * @param {number} requestId - Return request ID
   * @param {object} rejectData - Rejection reason
   * @param {string} token - Auth token
   */
  rejectReturn: async (requestId, rejectData, token) => {
    try {
      const response = await fetch(`${API_BASE}/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rejectData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject return');
      }
      return response.json();
    } catch (error) {
      console.error('Error rejecting return:', error);
      throw error;
    }
  },

  /**
   * Get technician inventory available for return
   * @param {number} technicianId - Technician ID
   * @param {string} token - Auth token
   */
  getTechnicianInventory: async (technicianId, token) => {
    try {
      const response = await fetch(`${API_BASE}/technician-inventory/${technicianId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch technician inventory');
      return response.json();
    } catch (error) {
      console.error('Error fetching technician inventory:', error);
      throw error;
    }
  },

  /**
   * Get return summary for a technician
   * @param {number} technicianId - Technician ID
   * @param {string} token - Auth token
   */
  getTechnicianReturnSummary: async (technicianId, token) => {
    try {
      const response = await fetch(`${API_BASE}/summary/${technicianId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch return summary');
      return response.json();
    } catch (error) {
      console.error('Error fetching return summary:', error);
      throw error;
    }
  }
};

export default spareReturnManagementService;
