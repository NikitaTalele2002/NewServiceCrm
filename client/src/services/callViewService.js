const API_BASE_URL = 'http://localhost:5000/api';

export const callViewService = {
  async fetchProductGroups() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/master-data?type=productgroup`);
      if (response.ok) {
        const data = await response.json();
        // console.error(":5000/api/branch/requests:1   Failed to load resource: the server responded with a status of 403 (Forbidden)");
        // console.error("client:809  [vite] SyntaxError: Invalid or unexpected token (at callViewService.js?t=1769053296615:11:20");
        // console.error("error	@	client:809");
        // console.error("warnFailedUpdate	@	client:180");
        // console.error("fetchUpdate	@	client:212");
        // console.error("await in fetchUpdate		");
        return data.rows || data.data || data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching product groups:', error);
      return [];
    }
  },

  async fetchActionLog(complaintId, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/complaints/${complaintId}/action-log`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to fetch action log');
    } catch (error) {
      console.error('Error fetching action log:', error);
      throw error;
    }
  },

  // Fetch service center details by ID
  async fetchServiceCenterById(centerId, token) {
    try {
      if (!centerId) return null;
      
      // Fetch all service centers and find by ID
      const response = await fetch(`${API_BASE_URL}/servicecenter/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (response.ok) {
        const centers = await response.json();
        if (Array.isArray(centers)) {
          const center = centers.find(c => String(c.Id || c.id) === String(centerId));
          if (center) {
            return center;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching service center:', error);
      return null;
    }
  },

  // Fetch technician details by ID
  async fetchTechnicianById(technicianId, token) {
    try {
      if (!technicianId) return null;
      const response = await fetch(`${API_BASE_URL}/technicians/${technicianId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error fetching technician:', error);
      return null;
    }
  },

  // Fetch all service centers for dropdown
  async fetchServiceCenters(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/servicecenter/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching service centers:', error);
      return [];
    }
  },

  // Fetch all technicians for dropdown
  async fetchTechnicians(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/technicians`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching technicians:', error);
      return [];
    }
  },

  // Fetch all states for master data lookup
  async fetchStates() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/master-data?type=state`);
      if (response.ok) {
        const data = await response.json();
        return data.rows || data.data || data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching states:', error);
      return [];
    }
  },

  // Fetch all cities for master data lookup
  async fetchCities() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/master-data?type=city`);
      if (response.ok) {
        const data = await response.json();
        return data.rows || data.data || data || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching cities:', error);
      return [];

    }
  }
}; 