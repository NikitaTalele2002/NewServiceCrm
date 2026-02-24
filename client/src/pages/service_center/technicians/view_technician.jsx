// src/pages/service_center/ViewTechnicians.jsx
import React, { useState, useEffect } from "react";

export default function ViewTechnicians({ technicians = [], onEdit, onRemove }) {
  const [selectedTech, setSelectedTech] = useState(null);
  const [techInventory, setTechInventory] = useState([]);
  const [showInventory, setShowInventory] = useState(false);

  const loadTechnicianInventory = async (techId) => {
    try {
      const response = await fetch(`/api/spare-requests/technicians/${techId}/inventory`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTechInventory(data);
      } else {
        console.error('Failed to load technician inventory');
        setTechInventory([]);
      }
    } catch (error) {
      console.error('Error loading technician inventory:', error);
      setTechInventory([]);
    }
  };

  const handleViewInventory = (tech) => {
    setSelectedTech(tech);
    setShowInventory(true);
    loadTechnicianInventory(tech.id);
  };

  const closeInventory = () => {
    setShowInventory(false);
    setSelectedTech(null);
    setTechInventory([]);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">View Technicians</h2>

      {technicians.length === 0 ? (
        <p>No technicians available.</p>
      ) : (
        
        <table className="border-2 border-gray-300 w-full text-left">
          <thead className="bg-gray-200">
            <tr>
              <th className="border-2 p-2">Technician ID</th>
              <th className="border-2 p-2">Name</th>
              <th className="border-2 p-2">Mobile No.</th>
              <th className="border-2 p-2">Email</th>
              <th className="border-2 p-2">Status</th>
              <th className="border-2 p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {technicians.map((tech) => (
              <tr key={tech.id}>
                <td className="border-2 p-2">{tech.id}</td>
                <td className="border-2 p-2">{tech.name}</td>
                <td className="border-2 p-2">{tech.mobileNo}</td>
                <td className="border-2 p-2">{tech.email}</td>
                <td className="border-2 p-2">{tech.status}</td>
                <td className="border-2 p-2 text-center">
                  <button
                    onClick={() => handleViewInventory(tech)}
                    className="bg-blue-600 hover:bg-blue-700 text-black px-3 py-1 rounded mr-2"
                  >
                    View Inventory
                  </button>
                  <button
                    onClick={() => onEdit(tech)}
                    className="bg-green-600 hover:bg-green-700 text-black px-3 py-1 rounded mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onRemove(tech.id)}
                    className="bg-red-600 hover:bg-red-700 text-black px-3 py-1 rounded"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Technician Inventory Modal */}
      {showInventory && selectedTech && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                Inventory for {selectedTech.name} (ID: {selectedTech.id})
              </h3>
              <button
                onClick={closeInventory}
                className="bg-red-600 hover:bg-red-700 text-black px-4 py-2 rounded"
              >
                Close
              </button>
            </div>

            {techInventory.length === 0 ? (
              <p>No inventory items found for this technician.</p>
            ) : (
              <table className="border-2 border-gray-300 w-full text-left">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border-2 p-2">SKU</th>
                    <th className="border-2 p-2">Spare Name</th>
                    <th className="border-2 p-2">Good Qty</th>
                    <th className="border-2 p-2">Defective Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {techInventory.map((item) => (
                    <tr key={item.id}>
                      <td className="border-2 p-2">{item.sku}</td>
                      <td className="border-2 p-2">{item.spareName}</td>
                      <td className="border-2 p-2">{item.goodQty}</td>
                      <td className="border-2 p-2">{item.defectiveQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



