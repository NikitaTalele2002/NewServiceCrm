import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useRole } from "../context/RoleContext";

// Role-aware navigation bar with profile dropdown
export default function Navbar() {
  const { role, isAuthenticated, user, logout } = useRole();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-500/90'}`;

  const handleLogout = () => {
    logout();
    setShowProfile(false);
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-blue-100  text-black">
      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 text-white font-bold">CRM Dashboard</div>
            <div className="hidden md:block ml-6">
              <div className="flex space-x-2 text-black">
                <NavLink to="/" className={linkClass}>Home</NavLink>
                <NavLink to="/call-centre/search" className={linkClass}>Call Centre</NavLink>
                <NavLink to="/service-center" className={linkClass}>Service Center</NavLink>
                <NavLink to="/call-centre/register" className={linkClass}>Register Product</NavLink>
                <NavLink to="/call-centre/show" className={linkClass}>Show Products</NavLink>
                <NavLink to="/service-center/complaints/view" className={linkClass}>Complaints</NavLink>
                  {role === 'branch' && <NavLink to="/branch" className={linkClass}>Branch Dashboard</NavLink>}
                  {role === 'branch' && <NavLink to="/branch/requests" className={linkClass}>Spare Requests</NavLink>}
                  {role === 'branch' && <NavLink to="/branch/inventory" className={linkClass}>Inventory</NavLink>}
                {role === 'admin' && <NavLink to="/service-center/complaints/pincode-masters" className={linkClass}>Pincode Masters</NavLink>}
                {role === 'admin' && <NavLink to="/admin/master-upload" className={linkClass}>Master Data</NavLink>}
                {role === 'admin' && <NavLink to="/admin/code-management" className={linkClass}>Code Management</NavLink>}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="flex items-center space-x-2">
              {!isAuthenticated && <NavLink to="/login" className={linkClass}>Login</NavLink>}
              {!isAuthenticated && <NavLink to="/signup" className={linkClass}>Signup</NavLink>}
              {isAuthenticated && (
                <div className="relative">
                  <button
                    onClick={() => setShowProfile(!showProfile)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-white hover:bg-blue-500/90">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">{user?.centerName || user?.username || 'User'}</span>
                  </button>
                  {showProfile && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded shadow-lg z-10">
                      <div className="p-3 border-b">
                        <p className="text-sm font-medium text-gray-900">{user?.centerName || user?.username}</p>
                        <p className="text-xs text-gray-500 capitalize">{role}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}


