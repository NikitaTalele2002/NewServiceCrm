import React, { useState } from 'react';
import Button from '../../components/common/Button';
import { useTechnicians } from '../../hooks/useTechnicians';
import TechnicianForm from '../../components/technicians/TechnicianForm';
import TechnicianTable from '../../components/technicians/TechnicianTable';

const ManageTechnicians = () => {
  const { technicians, loading, error, addTechnicianRequest } = useTechnicians();
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddTechnician = async (technicianData) => {
    const result = await addTechnicianRequest(technicianData);
    if (result.success) {
      alert('Add technician request submitted successfully');
    }
    return result;
  };

  const toggleAddForm = () => {
    setShowAddForm(prev => !prev);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Technician Management</h1>
        <p className="text-gray-600">Manage technician requests and view technician information</p>
      </div>

      <div className="mb-6">
        <Button
          onClick={toggleAddForm}
          variant={showAddForm ? 'secondary' : 'primary'}
        >
          {showAddForm ? 'Cancel' : '+ Add New Technician'}
        </Button>
      </div>

      <TechnicianForm
        onSubmit={handleAddTechnician}
        onCancel={() => setShowAddForm(false)}
        isVisible={showAddForm}
      />

      <TechnicianTable
        technicians={technicians}
        loading={loading}
        error={error}
      />
    </div>
  );
};

export default ManageTechnicians;