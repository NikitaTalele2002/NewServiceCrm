import React, { useEffect } from 'react';
import { FilterSelect } from '../common';

const TechnicianSelector = ({ technicians, selectedTechnician, onTechnicianChange, loading }) => {
  useEffect(() => {
    console.log('� TechnicianSelector rendered');
    console.log('   Technicians count:', technicians?.length || 0);
    if (technicians && technicians.length > 0) {
      console.log('   First technician:', technicians[0]);
    }
    console.log('   Selected:', selectedTechnician);
  }, [technicians, selectedTechnician]);

  const options = technicians && technicians.length > 0 
    ? technicians.map((tech, idx) => {
        const techId = tech.Id || tech.technician_id || tech.id;
        const techName = tech.Name || tech.name || `Technician ${techId}`;
        console.log(`   Option ${idx}:`, { id: techId, label: techName });
        return {
          id: techId,
          label: techName
        };
      })
    : [];

  const selectedValue = selectedTechnician?.Id || selectedTechnician?.technician_id || selectedTechnician || '';

  const handleChange = (value) => {
    console.log('🔄 Technician selection changed:', value);
    onTechnicianChange(value);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Technician</h3>
      {technicians && technicians.length === 0 && (
        <div className="text-yellow-600 text-sm mb-4">
          ⚠️ No technicians found for your service center
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <FilterSelect
            label="Technician"
            value={selectedValue}
            onChange={handleChange}
            options={options}
            placeholder={technicians && technicians.length > 0 ? "Select a technician" : "No technicians available"}
            disabled={loading || !technicians || technicians.length === 0}
          />
        </div>
        {selectedTechnician && (
          <div className="flex-1 p-4 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Selected:</strong> {selectedTechnician.Name || 'Unknown'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicianSelector;