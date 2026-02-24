/**
 * Status and SubStatus API Service
 * Handles all API calls related to status and sub-status tracking
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

/**
 * Get current status for a call
 * @param {number} callId - The call ID
 * @returns {Promise} Status response with current status and sub-status
 */
export const getCallCurrentStatus = async (callId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/call-center/complaint/${callId}/status`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching current status:', error);
    throw error;
  }
};

/**
 * Get complete status history for a call
 * @param {number} callId - The call ID
 * @returns {Promise} Status history response with timeline
 */
export const getCallStatusHistory = async (callId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/call-center/complaint/${callId}/status-history`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching status history:', error);
    throw error;
  }
};

/**
 * Status color mapping for UI display
 */
export const getStatusColor = (statusName) => {
  const colorMap = {
    'open': 'bg-blue-100 text-blue-800 border-blue-300',
    'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'closed': 'bg-green-100 text-green-800 border-green-300',
    'cancelled': 'bg-gray-100 text-gray-800 border-gray-300',
    'rejected': 'bg-red-100 text-red-800 border-red-300',
    'approved': 'bg-green-100 text-green-800 border-green-300',
    'approved_by_rsm': 'bg-cyan-100 text-cyan-800 border-cyan-300',
    'rejected_by_rsm': 'bg-pink-100 text-pink-800 border-pink-300'
  };
  
  return colorMap[statusName?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-300';
};

/**
 * Sub-status icon/emoji mapping for visual display
 */
export const getSubStatusIcon = (subStatusName) => {
  const iconMap = {
    'assigned to the service center': '🏢',
    'assigned to the technician': '👨‍🔧',
    'pending for spares': '⏳',
    'pending for replacement': '🔄',
    'pending for rsm approval': '👤',
    'pending for hod approval': '👥',
    'repair closed': '✅',
    'replacement closed': '✅',
    'rejected by rsm': '❌',
    'rejected by hod': '❌',
    'rejected by asc': '❌'
  };
  
  return iconMap[subStatusName?.toLowerCase()] || '📌';
};

/**
 * Format status name for display
 */
export const formatStatusName = (statusName) => {
  if (!statusName) return '-';
  return statusName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Format sub-status name for display
 */
export const formatSubStatusName = (subStatusName) => {
  if (!subStatusName) return '-';
  return subStatusName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default {
  getCallCurrentStatus,
  getCallStatusHistory,
  getStatusColor,
  getSubStatusIcon,
  formatStatusName,
  formatSubStatusName
};
