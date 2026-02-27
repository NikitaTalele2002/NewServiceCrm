/**
 * API Configuration
 * Centralized API endpoint configuration
 * Update the port here if the server port changes
 */

const API_CONFIG = {
  // Change this to match your server port
  BASE_URL: 'http://localhost:5000/api',
  
  // Endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    TEST_TOKEN: '/auth/test-token'
  },
  
  CALL_CENTER: {
    CUSTOMER: '/call-center/customer',
    COMPLAINT: '/call-center/complaint',
    COMPLAINTS: '/complaints',
    SERVICE_CENTERS: '/call-center/service-centers/pincode',
    COMPLAINTS_BY_SC: '/call-center/complaints/by-service-center',
    COMPLAINT_STATUS: '/call-center/complaint',
    STATUSES: '/call-center/statuses'
  },
  
  SPARE_REQUESTS: {
    BASE: '/spare-requests',
    TECHNICIAN_REQUESTS: '/technician-spare-requests',
    TECHNICIAN_SC_REQUESTS: '/technician-sc-spare-requests',
    RENTAL_ALLOCATION: '/technician-sc-spare-requests/rental-allocation'
  },
  
  LOGISTICS: {
    SYNC_SAP: '/logistics/sync-sap'
  },
  
  BRANCH: {
    INVENTORY: '/branch/current-inventory',
    REQUESTS: '/branch/branch-requests'
  },
  
  ADMIN: {
    MASTER_DATA: '/admin/master-data'
  },
  
  TECHNICIAN: {
    INVENTORY: '/technician-spare-requests/service-center/inventory',
    TECHNICIANS: '/technicians',
    BY_CENTRE: '/technicians/by-centre'
  },

  SPARE_RETURNS: {
    BASE: '/spare-return-requests'
  },

  LOCATION: {
    UPLOAD_EXCEL: '/location/uploadExcel'
  },

  RSM: {
    REQUESTS: '/rsm/spare-requests'
  }
};

// Helper function to build full URL
export function getApiUrl(endpoint) {
  if (endpoint.startsWith('http')) {
    return endpoint; // Already a full URL
  }
  return API_CONFIG.BASE_URL + endpoint;
}

// Helper function to build URL with path
export function buildApiUrl(section, subsection, ...paths) {
  let endpoint = API_CONFIG[section]?.[subsection];
  if (!endpoint) {
    console.warn(`Endpoint not found: ${section}.${subsection}`);
    return getApiUrl('');
  }
  
  if (paths.length > 0) {
    endpoint += '/' + paths.join('/');
  }
  
  return getApiUrl(endpoint);
}

export default API_CONFIG;
