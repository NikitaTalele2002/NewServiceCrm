import { useState, useCallback } from 'react';
import { createComplaintApi, searchComplaintsApi, getComplaintByIdApi, updateComplaintApi, getComplaintsApi, assignTechnicianApi } from '../services/complaintsService';

/**
 * Custom hook for complaint management operations
 * 
 * Manages complaint-related state and operations including:
 * - Creating new complaints
 * - Searching and retrieving complaints
 * - Updating complaint status and details
 * - Assigning technicians to complaints
 * 
 * @returns {Object} Complaints hook interface
 * @returns {Array} .complaints - List of complaints
 * @returns {boolean} .loading - Loading state for async operations
 * @returns {string|null} .error - Error message if operation fails
 * @returns {Function} .createComplaint - Register new complaint
 * @returns {Function} .searchComplaints - Search complaints with filters
 * @returns {Function} .getComplaintById - Fetch specific complaint details
 * @returns {Function} .updateComplaint - Update complaint information
 * @returns {Function} .getComplaints - Fetch all complaints for service center
 * @returns {Function} .assignTechnician - Assign technician to complaint
 */
export const useComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Register new customer complaint
   * 
   * @async
   * @param {Object} complaintData - Complaint information
   * @param {string} complaintData.mobileNo - Customer mobile number
   * @param {string} complaintData.productSerialNo - Product serial number
   * @param {string} complaintData.complaintType - Type of complaint
   * @param {string} complaintData.description - Complaint description
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  const createComplaint = useCallback(async (complaintData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createComplaintApi(complaintData);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Failed to create complaint';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Search complaints with filters
   * 
   * @async
   * @param {Object} searchParams - Search criteria
   * @param {string} [searchParams.complaintId] - Complaint ID
   * @param {string} [searchParams.mobileNo] - Customer mobile number
   * @param {string} [searchParams.status] - Complaint status
   * @param {string} [searchParams.dateRange] - Date range for complaints
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  const searchComplaints = useCallback(async (searchParams) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchComplaintsApi(searchParams);
      setComplaints(result);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Search failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch complaint details by ID
   * 
   * @async
   * @param {number} complaintId - Complaint ID to retrieve
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  const getComplaintById = useCallback(async (complaintId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getComplaintByIdApi(complaintId);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch complaint';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update complaint information
   * 
   * @async
   * @param {number} complaintId - Complaint ID to update
   * @param {Object} updateData - Fields to update
   * @param {string} [updateData.status] - New complaint status
   * @param {string} [updateData.remarks] - Additional remarks
   * @param {string} [updateData.resolution] - Resolution details
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  const updateComplaint = useCallback(async (complaintId, updateData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await updateComplaintApi(complaintId, updateData);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Failed to update complaint';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch all complaints for a service center
   * 
   * @async
   * @param {number} centerId - Service center ID
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  const getComplaints = useCallback(async (centerId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getComplaintsApi(centerId);
      const newComplaints = result.complaints || result.data || result;
      
      // Smart merge: preserve TechnicianName from local state only if backend data suggests it didn't fetch properly
      setComplaints(prevComplaints => {
        return (newComplaints || []).map(newComplaint => {
          // Key matching - handle both ComplaintId and call_id
          const complaintId = newComplaint.ComplaintId || newComplaint.call_id;
          const oldComplaint = prevComplaints.find(
            p => (p.ComplaintId || p.call_id) === complaintId
          );
          
          // CRITICAL: Only preserve old data if backend COMPLETELY FAILED to fetch technician
          // This means: either field is missing, or field is present but empty AND we had data before
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
      });
      
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch complaints';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Assign technician to complaint
   * 
   * @async
   * @param {number} complaintId - Complaint ID
   * @param {number} technicianId - Technician ID to assign
   * @param {boolean} [force=false] - Force assignment if already assigned
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  const assignTechnician = useCallback(async (complaintId, technicianId, force = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await assignTechnicianApi(complaintId, technicianId, force);
      
      // Immediately update the complaint in the local state with technician info
      if (result && result.assignedTechnicianName) {
        setComplaints(prevComplaints =>
          prevComplaints.map(c => 
            c.ComplaintId === complaintId || c.call_id === complaintId
              ? {
                  ...c,
                  AssignedTechnicianId: result.assignedTechnicianId,
                  TechnicianName: result.assignedTechnicianName,
                  AssignedTechnicianName: result.assignedTechnicianName
                }
              : c
          )
        );
      }
      
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message || 'Failed to assign technician';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    complaints,
    loading,
    error,
    createComplaint,
    searchComplaints,
    getComplaintById,
    updateComplaint,
    getComplaints,
    assignTechnician
  };
};