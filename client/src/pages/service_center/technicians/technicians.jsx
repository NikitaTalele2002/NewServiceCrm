import React, { useState } from "react";
// import Navbar from "./navbar";
import AddTechnician from "./add_technician";
import ViewTechnicians from "./view_technician";

export default function Technicians() {
  const [showSection, setShowSection] = useState("view");
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState(null);

  
  // Save or update technician
  const handleSave = (formData) => {
    if (formData.id) {
      setTechnicians((prev) =>
        prev.map((t) => (t.id === formData.id ? formData : t))
      );
      alert("Technician updated successfully!");
    } else {
      setTechnicians((prev) => [...prev, { ...formData, id: Date.now().toString() }]);
      alert("Technician added successfully!");
    }
    setShowSection("view");
  };

  const handleEdit = (tech) => {
    setSelectedTech(tech);
    setShowSection("add");
  };

  const handleRemove = (id) => {
    const confirmed = window.confirm("Are you sure you want to remove this technician?");
    if (confirmed) {
      setTechnicians((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <div className="flex flex-col bg-gray-100 h-screen w-screen">
      {/* <Navbar /> */}

      <div className="flex">
        <h2>this is technicians home page</h2>
        {/* <div className="w-1/5 bg-gray-200 p-4">
          <ul>
            <li className="p-2 cursor-pointer" onClick={() => setShowSection("add")}>
              Add Technician
            </li>
            <li className="p-2 cursor-pointer" onClick={() => setShowSection("view")}>
              View Technicians
            </li>
          </ul>
        </div> */}

        {/* <div className="flex-1 p-6">
          {showSection === "add" && (
            <AddTechnician selectedTech={selectedTech} onSave={handleSave} />
          )}
          {showSection === "view" && (
            <ViewTechnicians
              technicians={technicians}
              onEdit={handleEdit}
              onRemove={handleRemove}
            />
          )}
        </div> */}
      </div>
    </div>
  );
}
