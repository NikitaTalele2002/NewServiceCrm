import { useState, useEffect } from 'react';
import { callViewService } from '../services/callViewService';

export const useCallView = (call) => {
  const [productGroups, setProductGroups] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [serviceCenterName, setServiceCenterName] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [showActionLogModal, setShowActionLogModal] = useState(false);
  const [actionLogData, setActionLogData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get token from localStorage
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    let mounted = true;
    (async function loadMasterData() {
      try {
        const groups = await callViewService.fetchProductGroups();
        if (mounted) setProductGroups(Array.isArray(groups) ? groups : []);
        
        const stateData = await callViewService.fetchStates();
        if (mounted) setStates(Array.isArray(stateData) ? stateData : []);
        
        const cityData = await callViewService.fetchCities();
        if (mounted) setCities(Array.isArray(cityData) ? cityData : []);
      } catch (e) {
        console.warn('Failed to load master data', e);
        if (mounted) {
          setProductGroups([]);
          setStates([]);
          setCities([]);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load service center and technician details
  useEffect(() => {
    let mounted = true;
    const token = getToken();

    (async function loadAssignedDetails() {
      if (call?.AssignedCenterId) {
        try {
          const centerData = await callViewService.fetchServiceCenterById(call.AssignedCenterId, token);
          if (mounted && centerData) {
            // Try different field names that might contain the center name
            const centerName = 
              centerData.CenterName || 
              centerData.centerName || 
              centerData.name || 
              centerData.Name || 
              `Service Center ${call.AssignedCenterId}`;
            setServiceCenterName(centerName);
          } else if (mounted) {
            // If no data found, set a default message
            setServiceCenterName(`Service Center #${call.AssignedCenterId}`);
          }
        } catch (e) {
          console.warn('Failed to load service center', e);
          if (mounted) {
            setServiceCenterName(`Service Center #${call.AssignedCenterId}`);
          }
        }
      }

      if (call?.AssignedTechnicianId) {
        try {
          const techData = await callViewService.fetchTechnicianById(call.AssignedTechnicianId, token);
          if (mounted && techData) {
            setTechnicianName(techData.name || techData.Name || techData.TechnicianName || `Technician ${call.AssignedTechnicianId}`);
          }
        } catch (e) {
          console.warn('Failed to load technician', e);
        }
      }
    })();

    return () => { mounted = false; };
  }, [call?.AssignedCenterId, call?.AssignedTechnicianId]);

  const findProductGroupName = (pg) => {
    if (pg === null || pg === undefined) return "";
    let s = String(pg).trim();
    if (!s) return "";
    if (/^\d+\.0+$/.test(s)) {
      s = s.replace(/\.0+$/, "");
    }
    const byId = productGroups.find(g => {
      const gIds = [g.Id, g.id, g.VALUE, g.Value, g.value, g.ProductGroupID, g.ProductGroup];
      return gIds.some(x => {
        if (x === null || x === undefined) return false;
        const xs = String(x).trim();
        if (!xs) return false;
        if (xs === s) return true;
        if (!isNaN(Number(xs)) && !isNaN(Number(s)) && Number(xs) === Number(s)) return true;
        return false;
      });
    });
    if (byId) return byId.DESCRIPTION ?? byId.Description ?? byId.Name ?? byId.ProductGroup ?? byId.ProductGroupName ?? String(pg);
    const lower = s.toLowerCase();
    const byDesc = productGroups.find(g => {
      const cand = (g.Name || g.ProductGroup || g.Description || g.DESCRIPTION || g.Value || g.VALUE || "") + "";
      return cand.toLowerCase().trim() === lower;
    });
    if (byDesc) return byDesc.DESCRIPTION ?? byDesc.Description ?? byDesc.Name ?? byDesc.ProductGroup ?? String(pg);
    return s;
  };

  const handleActionLog = async () => {
    if (!call?.ComplaintId) return;

    setLoading(true);
    try {
      const token = getToken();
      const data = await callViewService.fetchActionLog(call.ComplaintId, token);
      setActionLogData(data);
      setShowActionLogModal(true);
    } catch (error) {
      alert('Error fetching action log');
    } finally {
      setLoading(false);
    }
  };

  return {
    productGroups,
    states,
    cities,
    serviceCenterName,
    technicianName,
    showActionLogModal,
    setShowActionLogModal,
    actionLogData,
    loading,
    findProductGroupName,
    handleActionLog
  };
};
