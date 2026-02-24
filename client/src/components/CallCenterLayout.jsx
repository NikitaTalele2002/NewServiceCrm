import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import Sidebar from './Sidebar';

export default function CallCenterLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { role } = useRole();
  const location = useLocation();

  const getTitle = () => {
    if (role === 'admin') return 'Admin - Finolex Service CRM';
    if (role === 'call_center') return 'Call Center - Finolex Service CRM';
    return 'Finolex Service CRM';
  };

  return (
    <div className="flex h-screen w-screen flex-col">
      {/* Top Navbar */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-30 flex items-center p-4 border-b h-[72px]">
        <img src="/vite.svg" alt="Company Logo" className="h-10 w-10 mr-4" />
        <h1 className="text-xl font-bold text-blue-600">{getTitle()}</h1>
      </div>
      
      {/* Sidebar + Content Wrapper */}
      <div className="flex flex-1 pt-[72px]">
        {/* Sidebar */}
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        
        {/* Main Content - Takes remaining width */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
