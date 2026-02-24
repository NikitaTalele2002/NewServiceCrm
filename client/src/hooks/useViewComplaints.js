import { useState, useEffect, useCallback } from 'react';
import { getComplaintsApi } from '../services/complaintsService';
import { getTechniciansByCentreApi } from '../services/technicianService';
import { searchProductsApi } from '../services/productsService';

export const useViewComplaints = (role, serviceCenterId) => {
  const [complaints, setComplaints] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Admins fetch all complaints; service centers fetch by their ID
      const centerId = role === 'admin' ? null : serviceCenterId;
      const result = await getComplaintsApi(centerId);

      const js = Array.isArray(result) ? result : result.complaints || result.rows || result.data || [];
      console.debug('GET /api/complaints response:', js);

      // Normalize complaint rows to stable product/model fields and trimmed serial
      const normalize = (r) => {
        if (!r) return r;
        const productCandidates = [
          r.Product,
          r.ProductName,
          r.ProductTitle,
          r.ProductDesc,
          r.ModelDescription,
          r.Brand,
          // nested shapes
          r.product && (r.product.Product || r.product.ProductName),
          r.p && (r.p.Product || r.p.ProductName),
        ].filter(Boolean);
        const modelCandidates = [
          r.Model,
          r.ModelName,
          r.MODEL,
          r.ModelDescription,
          r.product && (r.product.Model || r.product.ModelName),
          r.p && (r.p.Model || r.p.ModelName),
        ].filter(Boolean);
        r._product = productCandidates.length ? String(productCandidates[0]) : '';
        r._model = modelCandidates.length ? String(modelCandidates[0]) : '';
        r.ProductSerialNo = r.ProductSerialNo ? String(r.ProductSerialNo).trim() : '';
        return r;
      };
      const normalized = (js || []).map(normalize);
      
      // Smart merge: preserve TechnicianName from previous state only if backend didn't fetch it properly
      setComplaints(prevComplaints => {
        const merged = (normalized || []).map(newComplaint => {
          // Key matching - handle multiple ID field variations
          const complaintId = newComplaint.ComplaintId || newComplaint.call_id || newComplaint.CallId;
          const oldComplaint = prevComplaints.find(
            p => (p.ComplaintId || p.call_id || p.CallId) === complaintId
          );
          
          // CRITICAL: Only preserve old data if backend COMPLETELY FAILED to fetch technician
          const backendHasTechnicianData = 'TechnicianName' in newComplaint && newComplaint.TechnicianName;
          const weHadTechnicianData = oldComplaint && oldComplaint.TechnicianName;
          
          if (!backendHasTechnicianData && weHadTechnicianData) {
            // Backend failed to get data, but we have it cached - preserve it
            console.log(`🔄 Preserving cached technician for complaint ${complaintId}: ${oldComplaint.TechnicianName}`);
            return {
              ...newComplaint,
              TechnicianName: oldComplaint.TechnicianName,
              AssignedTechnicianName: oldComplaint.AssignedTechnicianName || oldComplaint.TechnicianName,
              AssignedTechnicianId: oldComplaint.AssignedTechnicianId || newComplaint.AssignedTechnicianId
            };
          }
          
          // Backend has data (or returned empty) - trust it completely
          return newComplaint;
        });
        return merged;
      });

      // If backend returned technicians here, store them too (helps the UI)
      if (result.technicians && Array.isArray(result.technicians)) setTechnicians(result.technicians);

      // Enrich complaints client-side: if Product is empty but ProductSerialNo exists,
      // try to lookup product by serial via POST /api/products/search and patch the rows.
      try {
        const missing = (normalized || []).filter(c => ((!c._product || String(c._product).trim() === '') && c.ProductSerialNo));
        if (missing.length) {
          for (const c of missing) {
            try {
              const searchResult = await searchProductsApi({ ProductSerialNo: c.ProductSerialNo });
              const rows2 = Array.isArray(searchResult) ? searchResult : searchResult.rows || searchResult.data || [];
              if (rows2 && rows2.length) {
                const p = rows2[0];
                // update normalized fields
                c._product = c._product || p.Product || p.ProductName || p.Product || '';
                c._model = c._model || p.Model || p.ModelName || '';
                // also keep top-level fields for backward-compat
                c.Product = c.Product || c._product;
                c.Model = c.Model || c._model;
              }
            } catch (e) {
              console.warn('Product lookup by serial failed for', c.ProductSerialNo, e);
            }
          }
        }
      } catch (e) {
        console.warn('Enrichment step failed', e);
      }
    } catch (err) {
      setError("Failed to fetch complaints");
    } finally {
      setLoading(false);
    }
  }, [role, serviceCenterId]);

  const fetchTechnicians = useCallback(async () => {
    // Skip for admin role - admins don't have a service center
    if (role === 'admin') {
      setTechnicians([]);
      return;
    }

    // Skip if service center ID is not available
    if (!serviceCenterId) {
      console.warn('Service center ID not found. Cannot fetch technicians.');
      setTechnicians([]);
      return;
    }

    try {
      const centreIdNum = Number(serviceCenterId);
      if (isNaN(centreIdNum)) {
        throw new Error(`Invalid service center ID: ${serviceCenterId}`);
      }

      const result = await getTechniciansByCentreApi(centreIdNum);
      const techs = Array.isArray(result) ? result : (result.technicians || []);
      console.log('Fetched technicians:', techs);
      setTechnicians(techs || []);
    } catch (err) {
      console.error("Error fetching technicians:", err);
      setTechnicians([]);
    }
  }, [role, serviceCenterId]);

  useEffect(() => {
    fetchComplaints();
    fetchTechnicians();
  }, [fetchComplaints, fetchTechnicians]);

  return {
    complaints,
    technicians,
    loading,
    error,
    refetchComplaints: fetchComplaints,
    refetchTechnicians: fetchTechnicians
  };
};