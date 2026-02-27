import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useRole } from "../context/RoleContext";

export default function Sidebar({ isCollapsed, setIsCollapsed }) {
  const { role, isAuthenticated, user, logout } = useRole();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState({});
  
  // Log role for debugging
  React.useEffect(() => {
    console.log('Sidebar rendered with role:', role, 'isAuthenticated:', isAuthenticated);
  }, [role, isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = (menuKey) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };


  // Only show the menu for the current role
  let menuItems = [];
  if (role === "admin") {
    menuItems = [
      {
        name: "Admin",
        icon: "⚙️",
        roles: ["admin"],
        children: [
          { name: "Master Data", path: "/admin/master-upload" },
          { name: "Code Management", path: "/admin/code-management" }
        ]
      }
    ];
  } else if (role === "call_center") {
    menuItems = [
      {
        name: "Call Centre",
        icon: "📞",
        roles: ["call_center"],
        children: [
          { name: "Service Registration", path: "/call-centre/service-registration" },
          { name: "Search Customer", path: "/call-centre/search" },
          { name: "Add Customer", path: "/call-centre/add-customer" },
          { name: "Register Product", path: "/call-centre/register-product" },
          { name: "Register Complaint", path: "/call-centre/complaint" },
          { name: "View Products", path: "/call-centre/show" },
          { name: "View Calls", path: "/call-centre/call-update" }
        ]
      }
    ];
  } else if (role === "service_center" || role === "service-centre" || role === "servicecentre") {
    menuItems = [
      {
        name: "Service Center",
        icon: "🔧",
        roles: ["service_center"],
        children: [
          { name: "Dashboard", path: "/service-center/dashboard" },
          {
            name: "Call Management",
            children: [
              {name:"Call Update", path:"/service-center/call-management/call-update"},
              { name: "Register Call", path: "/service-center/call-management/register-call" },
              { name: "Search Call", path: "/service-center/call-management/search-call" },
              { name: "View Complaints", path: "/service-center/complaints/view" },
              { name: "Assign Complaint", path: "/service-center/complaints/assign" }
            ]
          },
          {
            name: "Inventory",
            children: [
              { name: "Current Inventory", path: "/service-center/inventory/current-inventory" },
              { name: "Order Request", path: "/service-center/inventory/order-request" },
              { name: "Spare Part Return Request", path: "/service-center/inventory/spare-return" },
              { name: "Spare Return Request", path: "/service-center/inventory/spare-return-request" },
              { name: "Technician Current Inventory", path: "/service-center/technician-current-inventory" },
              { name: "Technician Inventory View", path: "/service-center/inventory/technician-inventory-view" },
              { name: "Rental Allocation", path: "/service-center/inventory/rental-allocation" },
              { name: "Rental Return", path: "/service-center/inventory/rental-return" },
              { name: "Generate DCF", path: "/service-center/inventory/generate-dcf" },
              { name: "Print Challan", path: "/service-center/inventory/print-challan" },
              { name: "DCF Status", path: "/service-center/inventory/dcf-status" }
            ]
          },
          {
            name: "Technicians",
            children: [
              { name: "View Technicians", path: "/service-center/technicians/technicians" },
              { name: "Add Technician", path: "/service-center/technicians/add" },
              { name: "View Technician", path: "/service-center/technicians/view" }
            ]
          },
          {
            name: "Product Replacement",
            children: [
              { name: "Set Replacement", path: "/service-center/product-replacement/set" },
              { name: "View History", path: "/service-center/product-replacement/history" }
            ]
          },
          {
            name: "Monthly Claims",
            children: [
              { name: "Dashboard", path: "/service-center/monthly-claims/dashboard" },
              { name: "View History", path: "/service-center/product-replacement/history" },
              { name: "Submit Claim", path: "/service-center/monthly-claims/submit-claim" }
            ]
          }
        ]
      }
    ];
  } else if (role === "branch" || role === "rsm") {
    menuItems = [
      {
        name: "Branch",
        icon: "🏢",
        roles: ["branch", "rsm"],
        children: [
          { name: "Dashboard", path: "/branch" },
          { name: "Spare Requests", path: "/branch/requests" },
          { name: "Inventory", path: "/branch/inventory" },
          { name: "Current Inventory", path: "/branch/current-inventory" },
          // RSM-specific links
          ...(role === 'rsm' ? [
            { name: "RSM Order Requests", path: "/branch/rsm-order-requests" },
            { name: "Return Approvals", path: "/branch/return-approvals" },
            { name: "Cancellation Approvals", path: "/branch/cancellation-approvals" }
          ] : []),
          { name: "Stock Adjust", path: "/branch/stock-adjust" },
          { name: "Return Requests", path: "/branch/returns" },
          { name: "Print Challan", path: "/branch/print-challan" },
          { name: "Approve Technician Requests", path: "/branch/approve-technician-requests" }
        ]
      }
    ];
  }

  const hasAccess = (itemRoles) => {
    if (itemRoles.includes("all")) return true;
    if (!isAuthenticated) return itemRoles.includes("public");
    return itemRoles.includes(role);
  };

  const linkClass = ({ isActive }) =>
    `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-blue-600 text-black' : 'text-gray-700 hover:bg-blue-100'
    }`;

  const subLinkClass = ({ isActive }) =>
    `flex items-center px-6 py-2 rounded-md text-sm transition-colors ${
      isActive ? 'bg-blue-500 text-black' : 'text-gray-600 hover:bg-blue-50'
    }`;

  return (
    <div className={`bg-white shadow-lg transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-[20vw]'} flex-shrink-0 overflow-y-auto flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded hover:bg-gray-100"
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems && menuItems.length > 0 ? (
          menuItems.filter(item => hasAccess(item.roles)).map((item, index) => (
          <div key={index}>
            {!item.children ? (
              <NavLink to={item.path} className={linkClass}>
                <span className="mr-3">{item.icon}</span>
                {!isCollapsed && <span>{item.name}</span>}
              </NavLink>
            ) : (
              <div>
                <button
                  onClick={() => toggleMenu(item.name)}
                  className="flex items-center w-full px-3 py-2 text-left rounded-md text-sm font-medium text-gray-700 hover:bg-blue-100 transition-colors">
                  <span className="mr-3">{item.icon}</span>
                  {!isCollapsed && <span className="flex-1">{item.name}</span>}
                  {!isCollapsed && (
                    <span className="ml-2">
                      {openMenus[item.name] ? '▼' : '▶'}
                    </span>
                  )}
                </button>
                {openMenus[item.name] && !isCollapsed && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child, i) => (
                      !child.children ? (
                        <NavLink key={i} to={child.path} className={subLinkClass}>
                          {child.name}
                        </NavLink>
                      ) : (
                        <div key={i}>
                          <button
                            onClick={() => toggleMenu(`${item.name}-${child.name}`)}
                            className="flex items-center w-full px-6 py-2 text-left rounded-md text-sm text-gray-600 hover:bg-blue-50 transition-colors">
                            <span className="flex-1">{child.name}</span>
                            <span className="ml-2">
                              {openMenus[`${item.name}-${child.name}`] ? '▼' : '▶'}
                            </span>
                          </button>
                          {openMenus[`${item.name}-${child.name}`] && (
                            <div className="ml-4 mt-1 space-y-1">
                              {child.children.map((subChild, j) => (
                                <NavLink key={j} to={subChild.path} className={subLinkClass}>
                                  {subChild.name}
                                </NavLink>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
        ) : (
          <div className="text-center py-8 text-red-600">
            <p className="font-semibold text-sm">⚠️ Error</p>
            <p className="text-xs mt-2">Role not defined properly</p>
            <p className="text-xs text-gray-600 mt-1">Current role: "{role}"</p>
            <button
              onClick={() => logout()}
              className="mt-4 px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">
              Logout & Login Again
            </button>
          </div>
        )}
      </nav>

      {/* User Profile */}
      {isAuthenticated && (
        <div className="border-t p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-black text-sm font-bold">
              {(user?.centerName || user?.username || user?.branchName || 'U').charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.centerName || user?.username || user?.branchName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{role}</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors">
              Logout
            </button>
          )}
        </div>
      )}

      {/* Login/Signup for non-authenticated */}
      {!isAuthenticated && !isCollapsed && (
        <div className="border-t p-4 space-y-2">
          <NavLink to="/login" className="block px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
            Login
          </NavLink>
          <NavLink to="/signup" className="block px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
            Signup
          </NavLink>
        </div>
      )}
    </div>
  );
}

