// src/components/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar = ({ activeModule }) => {
  const menu = {
    call: [ 
      { name: "Call Registration", path: "/call-centre/register" },
      { name: "Call Search", path: "/call-centre/search" }, 
      { name: "Report", path: "/call-centre/report" },
    ], 
    service: [
      { name: "Dashboard", path: "/service-center/dashboardSC" },
      {
        // here we can add the links like dropdown links 
        name: "Complaints",
        children: [
          { name: "View Complaints", path: "/service-center/complaints/view" },
          { name: "Search Complaint", path: "/service-center/complaints/assign" },
        ],
      },
    ],
    complaints:[
          { name: "View Complaints", path: "/service-center/complaints/view" },
          { name: "Search Complaint", path: "/service-center/complaints/assign" },
    ],
    inventory: [ 
      // { name: "Confirm Request", path: "/service-center/inventory/confirm-request" },
      { name: "Current Inventory", path: "/service-center/inventory/current-inventory" },
      { name: "Order Request", path: "/service-center/inventory/order-request" },
      { name: "Spare Part Return Request", path: "/service-center/inventory/spare-return" },
      { name: "Confirm Order", path: "/service-center/inventory/confirm-request" },
      { name: "Rental Allocation", path: "/service-center/inventory/rental-allocation" },
      { name: "Rental Return", path: "/service-center/inventory/rental-return" },
      { name:"Generate  DCF" , path:"/service-center/inventory/Generate-DCF"},
    ],
    technician: [
      {name:"Technician", path:"/service-center/technicians/technicians"},
      { name: "View Technician", path: "/service-center/technicians/view" },
      { name: "Add Technician", path: "/service-center/technicians/add" },
    ],
    product: [
      { name: "Set Replacement", path: "/service-center/product-replacement/set" },
      { name: "View Replacement History", path: "/service-center/product-replacement/history" },
    ],
  };

  if (!activeModule) return null;

  return (
    <div className="w-64 bg-gray-100 h-screen shadow-lg p-4 flex flex-col">
      {(menu[activeModule] || []).map((item, index) => (
        <div key={index}>
          {!item.children ? (
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `block px-4 py-2 rounded mb-1 ${
                  isActive ? "bg-blue-500 text-black" : "hover:bg-gray-200"
                }`
              } >
              {item.name}
            </NavLink>
          ) : (
            <div className="mb-2">
              <p className="px-4 py-2 font-semibold">{item.name}</p>
              <div className="ml-4 flex flex-col">
                {item.children.map((child, i) => (
                  <NavLink
                    key={i}
                    to={child.path}
                    className={({ isActive }) =>
                      `block px-4 py-2 rounded mb-1 ${
                        isActive ? "bg-blue-500 text-black" : "hover:bg-gray-200"
                      }`
                    }> {child.name}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Sidebar;


