import { useState, useEffect } from 'react';
import { getTechniciansByCentreApi } from '../services/technicianService';
import { useProducts } from './useProducts';

export const useDCFGeneration = () => {
  const initialFormData = {
    technician: "",
    productGroup: "",
    productType: "",
    model: "",
    quantity: "",
    remarks: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [dcfList, setDcfList] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    productGroups,
    allProducts,
    models,
    getProductGroups,
    getProducts,
    getModels
  } = useProducts();

  // Load initial data
  useEffect(() => {
    loadTechnicians();
    getProductGroups();
  }, []);

  // Load products when product group changes
  useEffect(() => {
    if (formData.productGroup) {
      getProducts();
    }
  }, [formData.productGroup]);

  // Load models when product type changes
  useEffect(() => {
    if (formData.productType) {
      getModels();
    }
  }, [formData.productType]);

  const loadTechnicians = async () => {
    try {
      const serviceCenterId = localStorage.getItem('serviceCenterId');
      if (!serviceCenterId) {
        setTechnicians([]);
        return;
      }

      const result = await getTechniciansByCentreApi(serviceCenterId);
      const techs = Array.isArray(result) ? result : (result.technicians || []);
      const mapped = (techs || []).map(t => ({
        ...t,
        Id: t.Id ?? t.id,
        displayName: (t.TechnicianName || t.Name || ((t.FirstName || '') + ' ' + (t.LastName || '')).trim() || t.DisplayName || t.username || '').trim()
      }));
      setTechnicians(mapped);
    } catch (err) {
      console.error('Failed to load technicians', err);
      setTechnicians([]);
    }
  };

  const handleFormChange = (newFormData) => {
    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Here you would typically call an API to generate the DCF
      // For now, we'll just add it to the local list
      const newDCF = {
        id: Date.now(),
        ...formData,
        technicianName: technicians.find(t => t.Id === formData.technician)?.displayName,
        productGroupName: productGroups.find(g => g.id === formData.productGroup)?.name,
        productName: allProducts.find(p => p.id === formData.productType)?.name,
        modelName: models.find(m => m.id === formData.model)?.name,
        createdAt: new Date().toISOString()
      };

      setDcfList(prev => [...prev, newDCF]);
      setFormData(initialFormData);
      alert('DCF generated successfully!');
    } catch (err) {
      setError('Failed to generate DCF');
      console.error('DCF generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter products by selected product group
  const filteredProducts = allProducts.filter(product =>
    !product.ProductGroupID || product.ProductGroupID === formData.productGroup
  );

  // Filter models by selected product type
  const filteredModels = models.filter(model =>
    !model.ProductID || model.ProductID === formData.productType
  );

  return {
    formData,
    dcfList,
    technicians,
    productGroups,
    products: filteredProducts,
    models: filteredModels,
    loading,
    error,
    handleFormChange,
    handleSubmit
  };
};
