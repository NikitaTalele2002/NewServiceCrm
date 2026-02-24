const API_BASE_URL = '/api/returns';
const SPARE_RETURNS_URL = '/api/spare-returns';

export const dcfService = {
  async fetchAllDCFData(token) {
    try {
      // Fetch only spare-part return requests for DCF status page
      const spareReturns = await this.fetchSpareDCFRequests(token);

      // Return only spare return requests sorted by date
      return spareReturns.sort((a, b) => new Date(b.dcfSubmitDate) - new Date(a.dcfSubmitDate));
    } catch (error) {
      console.error('Error fetching DCF data:', error);
      throw error;
    }
  },

  async fetchRegularDCFRequests(token) {
    try {
      // First fetch all regular requests
      const response = await fetch(`${API_BASE_URL}/service-center-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch return requests');
      const requests = await response.json();

      // Then fetch details for each request to build DCF data
      const dcfPromises = requests.map(async (req) => {
        try {
          const detailResponse = await fetch(`${API_BASE_URL}/service-center-requests/${req.id}/details`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (!detailResponse.ok) return null;
          const data = await detailResponse.json();
          const items = data.items || [];
          const totalQty = items.reduce((sum, it) => sum + (Number(it.requestedQty || it.qtyDcf || 0)), 0);
          const rsmApproved = items.reduce((sum, it) => sum + (Number(it.rsmApprovedQty || it.cfApprovedQty || it.ApprovedQty || 0)), 0);
          return {
            id: req.id,
            dcfNo: data.requestId || data.requestNumber || req.requestId,
            totalDcfQty: totalQty,
            rsmApprovedQty: rsmApproved,
            dcfSubmitDate: data.dcfSubmitDate || req.createdAt || '',
            cfReceiptDate: data.cfReceiptDate || '',
            cfApprovalDate: data.cfApprovalDate || '',
            cnDate: data.cnDate || '',
            cnValue: data.cnValue || '',
            cnCount: data.cnCount || 0,
            type: 'regular'
          };
        } catch (error) {
          console.error(`Error fetching details for request ${req.id}:`, error);
          return null;
        }
      });

      const dcfResults = await Promise.all(dcfPromises);
      return dcfResults.filter(item => item !== null);
    } catch (error) {
      console.error('Error fetching regular DCF requests:', error);
      return [];
    }
  },

  async fetchSpareDCFRequests(token) {
    try {
      // Fetch spare return requests from the new endpoint
      const response = await fetch(`${SPARE_RETURNS_URL}/dcf-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        console.warn('Spare return requests not available');
        return [];
      }
      const spareRequests = await response.json();
      
      // Map to DCF format (already in the right format from backend)
      return spareRequests.map(req => ({
        ...req,
        cfApprovedQty: req.rsmApprovedQty, // Map RSM approved to cf approved for display
        type: 'spare'
      }));
    } catch (error) {
      console.error('Error fetching spare DCF requests:', error);
      return [];
    }
  },

  async fetchDCFDetails(requestId, token) {
    try {
      // Fetch spare return request details
      const res = await fetch(`${SPARE_RETURNS_URL}/view/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch request details');
      const data = await res.json();
      
      // Map spare request data to DCF details format
      const request = { 
        id: data.request?.requestId || requestId, 
        requestNumber: data.request?.requestNumber || `SPR-${requestId}`
      };
      
      // Normalize items from spare request format
      const items = (data.request?.items || []).map(it => ({
        sku: it.partCode || 'N/A',
        spareName: it.partDescription || 'Unknown',
        requestedQty: Number(it.returnQty || 0),
        receivedQty: 0,
        approvedQty: Number(it.approvedQty || 0),
        rejectedQty: 0
      }));
      
      return { 
        request, 
        items,
        cnDate: null,
        cnValue: null,
        cnCount: 0
      };
    } catch (error) {
      console.error('Error fetching request details:', error);
      throw error;
    }
  }
};