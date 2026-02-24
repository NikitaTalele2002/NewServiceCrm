// src/components/Navbar.jsx
import React from "react";

const Navbar = ({ setActiveModule, activeModule }) => {
  const modules = [
    // { name: "Call Centre", key: "call" },
    {name:"Complaints", key:"complaints"},
    { name: "Service Center", key: "service" },
    { name: "Inventory", key: "inventory" },
    { name: "Technicians", key: "technician" },
    { name: "Product Replacement", key: "product" },
  ];

  return (
    <nav className="bg-blue-500 text-black p-4 flex space-x-4 shadow">
      {modules.map((module) => (
        <button
          key={module.key}
          onClick={() => setActiveModule(module.key)}
          className={`px-4 py-2 rounded ${
            activeModule === module.key ? "bg-white text-blue-500" : "hover:bg-blue-700"
          }`}>
          {module.name}
        </button>
      ))}
    </nav>
  );
};
// this navbar is used only in service center pages.
export default Navbar;