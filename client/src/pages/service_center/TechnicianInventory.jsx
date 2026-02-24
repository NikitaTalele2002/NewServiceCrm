import React, { useState, useEffect } from 'react';
import { useServiceCenter } from '../../hooks/useServiceCenter';
import { TechnicianSelector, TechnicianInventoryTable } from '../../components/technicians';

const TechnicianInventory = () => {
  const {
    technicians,
    technicianInventory,
    loading,
    error,
    fetchTechniciansByCentre,
    fetchTechnicianInventory
  } = useServiceCenter();

  const [selectedTechnician, setSelectedTechnician] = useState(null);

  useEffect(() => {
    fetchTechniciansByCentre();
  }, [fetchTechniciansByCentre]);

  const handleTechnicianChange = async (technicianId) => {
    if (!technicianId) {
      setSelectedTechnician(null);
      return;
    }

    const technician = technicians.find(t => t.Id === parseInt(technicianId));
    setSelectedTechnician(technician);

    await fetchTechnicianInventory(technicianId);
  };

  const handleRetry = () => {
    if (selectedTechnician) {
      fetchTechnicianInventory(selectedTechnician.Id);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Technician Inventory</h1>
        <p className="text-gray-600">View inventory assigned to technicians</p>
      </div>

      <TechnicianSelector
        technicians={technicians}
        selectedTechnician={selectedTechnician}
        onTechnicianChange={handleTechnicianChange}
        loading={loading}
      />

      <TechnicianInventoryTable
        inventory={technicianInventory}
        technician={selectedTechnician}
        loading={loading}
        error={error}
        onRetry={handleRetry}
      />
    </div>
  );
};

export default TechnicianInventory;
