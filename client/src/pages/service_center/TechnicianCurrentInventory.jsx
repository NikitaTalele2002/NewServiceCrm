import React, { useState, useEffect } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { TechnicianSelector, TechnicianInventoryTable } from '../../components/technicians';
import { InventoryFilters } from '../../components/inventory';

const TechnicianCurrentInventory = () => {
  const {
    productGroups,
    products,
    models,
    loading,
    error,
    getProductGroups,
    getProductsByGroup,
    getModelsByProduct,
    getSparesByModel
  } = useInventory();

  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [technicianInventory, setTechnicianInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState(null);
  const [filters, setFilters] = useState({
    productGroup: '',
    productType: '',
    model: ''
  });

  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);

  useEffect(() => {
    fetchTechnicians();
    getProductGroups();
  }, [getProductGroups]);

  useEffect(() => {
    if (filters.productGroup) {
      getProductsByGroup(filters.productGroup);
    }
  }, [filters.productGroup, getProductsByGroup]);

  useEffect(() => {
    if (filters.productType) {
      getModelsByProduct(filters.productType);
    }
  }, [filters.productType, getModelsByProduct]);

  useEffect(() => {
    if (filters.model) {
      getSparesByModel(filters.model);
    }
  }, [filters.model, getSparesByModel]);

  useEffect(() => {
    if (filters.productGroup) {
      const filtered = products.filter(p =>
        String(p.ProductGroupID || p.ProductGroupId) === String(filters.productGroup)
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [filters.productGroup, products]);

  useEffect(() => {
    if (filters.productType) {
      const filtered = models.filter(m =>
        String(m.ProductID || m.ProductId) === String(filters.productType)
      );
      setFilteredModels(filtered);
    } else {
      setFilteredModels([]);
    }
  }, [filters.productType, models]);

  const fetchTechnicians = async () => {
    const serviceCenterId =
      localStorage.getItem('selectedServiceCenterId') ||
      localStorage.getItem('serviceCenterId');

    console.log('📱 Fetching technicians for SC:', serviceCenterId);

    if (!serviceCenterId) {
      console.error('❌ No service center ID found');
      return;
    }

    try {
      const res = await fetch(
        `/api/technicians/by-centre?centerId=${serviceCenterId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      const data = await res.json();
      console.log('✅ Technicians fetched:', data.technicians?.length || 0);
      setTechnicians(data.technicians || []);
    } catch (err) {
      console.error('❌ Error fetching technicians:', err);
    }
  };

  // Fetch technician inventory from service-center endpoint
  const fetchTechnicianInventory = async (technicianId) => {
    if (!technicianId) {
      setTechnicianInventory([]);
      return;
    }

    setInventoryLoading(true);
    setInventoryError(null);

    try {
      console.log('📦 Fetching inventory for technician:', technicianId);
      const token = localStorage.getItem('token');
      
      // Use the service-center inventory endpoint that returns all technicians
      const response = await fetch(
        `http://localhost:5000/api/technician-spare-requests/service-center/inventory`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Service center inventory data received:', data);
      console.log('🔍 Looking for technician ID:', technicianId);

      if (data.success && data.technicians) {
        // Find the selected technician's inventory
        const selectedTech = data.technicians.find(
          t => Number(t.technician_id) === Number(technicianId)
        );

        console.log('🎯 Selected technician:', selectedTech);

        if (selectedTech && selectedTech.inventory) {
          console.log(`✅ Found ${selectedTech.inventory.length} items for technician ${technicianId}`);
          console.log('📋 Inventory items:', selectedTech.inventory);
          setTechnicianInventory(selectedTech.inventory);
        } else {
          console.log(`⚠️ No inventory found for technician ${technicianId}`);
          setTechnicianInventory([]);
        }
      } else {
        console.error('❌ Invalid response format:', data);
        setInventoryError('Invalid response format from server');
      }
    } catch (err) {
      console.error('❌ Error fetching technician inventory:', err);
      setInventoryError(err.message || 'Failed to fetch inventory');
      setTechnicianInventory([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleTechnicianChange = (technicianId) => {
    console.log('🔄 Technician changed to:', technicianId);
    setSelectedTechnician(technicianId);
    fetchTechnicianInventory(technicianId);
  };

  const handleFilterChange = (name, value) => {
    if (name === 'productGroup') {
      setFilters({
        productGroup: value,
        productType: '',
        model: ''
      });
    } else if (name === 'productType') {
      setFilters(prev => ({
        ...prev,
        productType: value,
        model: ''
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const selectedTechnicianObj = technicians.find(t => {
    const techId = Number(t.Id) || Number(t.technician_id) || t.Id;
    const selectedId = Number(selectedTechnician);
    return techId === selectedId;
  });

  const options = {
    productGroups: productGroups.map(pg => ({
      id: pg.Id || pg.ID || pg.id,
      label: pg.DESCRIPTION || pg.Description || pg.NAME || pg.Name || pg.VALUE || pg.Value
    })),
    products: filteredProducts.map(p => ({
      id: p.id || p.Id || p.ID,
      label: p.name || p.DESCRIPTION || p.ProductName || p.Value
    })),
    models: filteredModels.map(m => ({
      id: m.id || m.Id || m.ID,
      label: m.name || m.MODEL_DESCRIPTION || m.MODEL || m.Value
    }))
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Technician Current Inventory</h1>
        <p className="text-gray-600">View and filter technician inventory by product categories</p>
      </div>

      <TechnicianSelector
        technicians={technicians}
        selectedTechnician={selectedTechnicianObj}
        onTechnicianChange={handleTechnicianChange}
        loading={loading}
      />

      {selectedTechnician && (
        <>
          <InventoryFilters
            filters={filters}
            options={options}
            onFilterChange={handleFilterChange}
            onSearch={() => {}} // No search needed, filters update automatically
            loading={loading}
          />

          <TechnicianInventoryTable
            inventory={technicianInventory}
            technician={selectedTechnicianObj}
            loading={inventoryLoading}
            error={inventoryError}
            onRetry={() => selectedTechnician && fetchTechnicianInventory(selectedTechnician)}
          />
        </>
      )}

      {!selectedTechnician && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center mt-8">
          <p className="text-blue-900 text-lg">👆 Please select a technician to view their inventory</p>
        </div>
      )}
    </div>
  );
};

export default TechnicianCurrentInventory;
