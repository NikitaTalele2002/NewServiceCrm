import { useState, useEffect, useContext } from 'react';
import { RoleContext } from '../context/RoleContext';
import { productReplacementService } from '../services/productReplacementService';

export const useProductReplacement = () => {
  const [formData, setFormData] = useState({
    callId: '',
    productGroup: '',
    product: '',
    model: '',
    serialNo: '',
    rsm: '',
    hod: '',
    technician: '',
    asc: '',
    requestedBy: '',
    spareOrderRequestNo: '',
    replacementReason: ''
  });

  const [options, setOptions] = useState({
    productGroups: [],
    products: [],
    models: [],
    technicians: [],
    serviceCenters: [],
    users: []
  });

  const [loading, setLoading] = useState(false);
  const [complaintLoading, setComplaintLoading] = useState(false);
  const [isDataFetched, setIsDataFetched] = useState(false);

  const { user } = useContext(RoleContext);

  useEffect(() => {
    fetchProductGroups();
    fetchTechnicians();
    fetchServiceCenters();
    fetchUsers();
  }, []);

  useEffect(() => {
    // Set ASC to logged-in user's service center name
    if (user?.serviceCenterId && options.serviceCenters.length > 0) {
      const sc = options.serviceCenters.find(s => s.Id === user.serviceCenterId);
      if (sc) {
        setFormData(prev => ({ ...prev, asc: sc.CenterName }));
      }
    }
  }, [user, options.serviceCenters]);

  useEffect(() => {
    if (options.products.length > 0 && formData.product && !options.models.length) {
      const selectedProduct = options.products.find(p => p.DESCRIPTION === formData.product);
      if (selectedProduct) {
        fetchModels(selectedProduct.ID);
      }
    }
  }, [options.products, formData.product]);

  const fetchProductGroups = async () => {
    const token = localStorage.getItem('token');
    const data = await productReplacementService.fetchProductGroups(token);
    setOptions(prev => ({ ...prev, productGroups: data }));
    return data;
  };

  const fetchProducts = async (groupId) => {
    const token = localStorage.getItem('token');
    const data = await productReplacementService.fetchProducts(groupId, token);
    setOptions(prev => ({ ...prev, products: data }));
    return data;
  };

  const fetchModels = async (productId) => {
    const token = localStorage.getItem('token');
    const data = await productReplacementService.fetchModels(productId, token);
    setOptions(prev => ({ ...prev, models: data }));
    return data;
  };

  const fetchTechnicians = async () => {
    const token = localStorage.getItem('token');
    const centerId = user?.serviceCenterId;
    const data = await productReplacementService.fetchTechnicians(centerId, token);
    setOptions(prev => ({ ...prev, technicians: data }));
    return data;
  };

  const fetchServiceCenters = async () => {
    const token = localStorage.getItem('token');
    const data = await productReplacementService.fetchServiceCenters(token);
    setOptions(prev => ({ ...prev, serviceCenters: data }));
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    const data = await productReplacementService.fetchUsers(token);
    setOptions(prev => ({ ...prev, users: data }));
  };

  const fetchComplaint = async (callId) => {
    if (!callId) {
      setIsDataFetched(false);
      return;
    }
    setComplaintLoading(true);
    setIsDataFetched(false);
    try {
      const token = localStorage.getItem('token');
      const complaint = await productReplacementService.fetchComplaint(callId, token);

      // Check if complaint is assigned to user's service center
      if (Number(complaint.assignedCenterId) !== Number(user?.serviceCenterId)) {
        alert('This complaint is not assigned to your service center. You cannot access it.');
        setIsDataFetched(false);
        return;
      }

      // Populate form data with complaint details
      if (complaint.product) {
        const groups = options.productGroups.length ? options.productGroups : await fetchProductGroups();
        const groupName = complaint.product.group || complaint.product.ProductGroup || '';
        const groupObj = groups.find(g => {
          const d = (g.DESCRIPTION || g.Description || g.name || '').toString().toLowerCase();
          return d === (groupName || '').toString().toLowerCase();
        });
        let pg = groupObj ? groupObj.Id : (complaint.product.ProductGroupID || '');

        const productName = (complaint.product.name || complaint.product.Product || '').toString();
        let productObj = null;
        let products = options.products.length ? options.products : [];
        if (pg) {
          products = await fetchProducts(pg);
          productObj = products.find(p => {
            const d = (p.DESCRIPTION || p.Description || p.name || '').toString().toLowerCase();
            return d === productName.toLowerCase();
          });
        }

        if (!productObj) {
          for (const g of groups) {
            if (g.Id === pg) continue;
            const prods = await fetchProducts(g.Id);
            const found = prods.find(p => ((p.DESCRIPTION || p.Description || p.name || '').toString().toLowerCase() === productName.toLowerCase()));
            if (found) {
              productObj = found;
              pg = g.Id;
              products = prods;
              break;
            }
          }
        }

        const pr = productObj ? (productObj.DESCRIPTION || productObj.Description || productObj.name || '') : productName;

        let md = complaint.product.model || complaint.product.Model || complaint.product.ModelDescription || complaint.product.modelDescription || '';
        if (productObj) {
          const models = options.models.length ? options.models : await fetchModels(productObj.ID);
          const modelObj = models.find(m => {
            const mv = (m.MODEL_DESCRIPTION || m.ModelDescription || m.MODEL || m.MODEL_DESC || '').toString().toLowerCase();
            return mv === (md || '').toString().toLowerCase();
          });
          if (modelObj) md = modelObj.MODEL_DESCRIPTION || modelObj.ModelDescription || md;
        }

        const sn = complaint.product.serialNo || complaint.ProductSerialNo || '';
        const techName = (complaint.call && (complaint.call.technician || complaint.call.TechnicianName)) || complaint.technician || complaint.AssignedTechnicianName || '';
        const techs = options.technicians.length ? options.technicians : await fetchTechnicians();
        const techObj = techs.find(t => {
          const tn = (t.Name || t.TechnicianName || t.name || '').toString().toLowerCase();
          return tn === (techName || '').toString().toLowerCase();
        });
        const techVal = techObj ? String(techObj.Id) : '';

        const ascId = complaint.assignedCenterId ? String(complaint.assignedCenterId) : '';

        setFormData(prev => ({
          ...prev,
          productGroup: pg ? String(pg) : '',
          product: pr || '',
          model: md || '',
          serialNo: sn || '',
          technician: techVal || '',
          asc: ascId || ''
        }));

        if (pg && !options.products.length) await fetchProducts(pg);
        if (productObj && !options.models.length) await fetchModels(productObj.ID);

        alert(`Complaint data fetched successfully for Call ID: ${callId}`);

        setIsDataFetched(true);

        // Fetch spare request
        const requests = await productReplacementService.fetchSpareRequests(callId, token);
        if (requests.length > 0) {
          setFormData(prev => ({ ...prev, spareOrderRequestNo: requests[0]?.RequestNumber || '' }));
        }
      } else {
        alert('No product associated with this complaint');
        setIsDataFetched(false);
      }
    } catch (error) {
      alert('Complaint not found or error: ' + error.message);
      setIsDataFetched(false);
    } finally {
      setComplaintLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'callId') {
      if (!value) {
        setIsDataFetched(false);
        setFormData(prev => ({
          ...prev,
          productGroup: '',
          product: '',
          model: '',
          serialNo: '',
          technician: '',
          asc: '',
          spareOrderRequestNo: ''
        }));
      }
    } else if (name === 'productGroup') {
      fetchProducts(value);
      setFormData(prev => ({ ...prev, product: '', model: '' }));
      setOptions(prev => ({ ...prev, products: [], models: [] }));
    } else if (name === 'product') {
      const selectedProduct = options.products.find(p => p.DESCRIPTION === value);
      if (selectedProduct) {
        fetchModels(selectedProduct.ID);
        setFormData(prev => ({ ...prev, model: '' }));
        setOptions(prev => ({ ...prev, models: [] }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = {
      callId: 'Call ID',
      productGroup: 'Product Group',
      product: 'Product',
      model: 'Model',
      serialNo: 'Serial Number',
      technician: 'Technician',
      asc: 'Service Center',
      requestedBy: 'Requested By',
      replacementReason: 'Replacement Reason'
    };

    const missingFields = Object.keys(requiredFields).filter(
      field => !formData[field] || formData[field].toString().trim() === ''
    );

    if (missingFields.length > 0) {
      alert(`Please fill in all required fields:\n${missingFields.map(f => requiredFields[f]).join('\n')}`);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const cleanFormData = {
        ...formData,
        requestedBy: formData.requestedBy.trim()
      };
      await productReplacementService.submitReplacementRequest(cleanFormData, token);
      alert('Replacement request submitted successfully!');

      // Reset form
      setFormData({
        callId: '',
        productGroup: '',
        product: '',
        model: '',
        serialNo: '',
        rsm: '',
        hod: '',
        technician: '',
        asc: '',
        requestedBy: '',
        spareOrderRequestNo: '',
        replacementReason: ''
      });
      setIsDataFetched(false);
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    setFormData,
    options,
    loading,
    complaintLoading,
    isDataFetched,
    handleInputChange,
    handleSubmit,
    fetchComplaint
  };
};

export const useReplacementHistory = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    callId: '',
    status: '',
    requestedBy: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const fetchReplacementHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching replacement history with filters:', filters, 'pagination:', pagination, 'token:', token ? 'exists' : 'missing');
      const result = await productReplacementService.fetchReplacementHistory(filters, pagination, token);
      console.log('Replacement history result:', result);
      setData(result?.data || []);
      setPagination(result?.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
    } catch (error) {
      console.error('Error fetching replacement history:', error);
      setData([]);
      setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplacementHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.callId, filters.status, filters.startDate, filters.endDate, filters.requestedBy, pagination.page]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return {
    data,
    loading,
    filters,
    pagination,
    handleFilterChange,
    handlePageChange,
    refetch: fetchReplacementHistory
  };
};