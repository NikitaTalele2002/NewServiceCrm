import { useState, useCallback, useEffect } from 'react';
import { fetchTechniciansApi, addTechnicianRequestApi, getTechniciansByCentreApi } from '../services/technicianService';

export const useTechnicians = () => {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTechnicians = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTechniciansApi();
      setTechnicians(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTechnicianRequest = useCallback(async (technicianData) => {
    try {
      await addTechnicianRequestApi(technicianData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const getTechniciansByCentre = useCallback(async (centerId) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 useTechnicians.getTechniciansByCentre called with centerId:', centerId);
      const data = await getTechniciansByCentreApi(centerId);
      console.log('📥 Raw data received from API:', data);
      console.log('   → data.technicians:', data?.technicians);
      console.log('   → data.technicians is Array?', Array.isArray(data?.technicians));
      console.log('   → data.technicians length:', data?.technicians?.length || 'undefined');
      
      // The API returns { technicians: [...] }
      const techList = data.technicians || data;
      console.log('📋 After extraction (techList):', techList);
      console.log('   → techList is Array?', Array.isArray(techList));
      console.log('   → techList type:', typeof techList);
      
      if (Array.isArray(techList)) {
        console.log('✅ techList is an array with length:', techList.length);
        if (techList.length > 0) {
          console.log('📋 First technician:', techList[0]);
        }
      } else {
        console.error('❌ ERROR: techList is NOT an array!', techList);
      }
      
      setTechnicians(techList);
      return { success: true, data: techList };
    } catch (err) {
      console.error('❌ Error fetching technicians:', err.message);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  return {
    technicians,
    loading,
    error,
    fetchTechnicians,
    addTechnicianRequest,
    getTechniciansByCentre
  };
}; 
