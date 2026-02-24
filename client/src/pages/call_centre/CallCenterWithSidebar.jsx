import React, { useState } from 'react';
import { useRole } from '../../context/RoleContext';
import Sidebar from '../../components/Sidebar';
import SearchForm from './SearchForm';
import AddCustomerForm from './AddCustomerForm';
import RegisterProduct from './RegisterProduct';
import ComplaintForm from './ComplaintForm';
import ShowProducts from './ShowProducts';
import CallUpdate from './CallUpdate';

export default function CallCenterWithSidebar() {
  const [activePage, setActivePage] = useState('dashboard');
  const { user } = useRole();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const pages = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'View overview and statistics',
      icon: '📊',
      component: 'dashboard'
    },
    {
      id: 'search',
      title: 'Search Customer',
      description: 'Find existing customers by mobile number or name',
      icon: '🔍',
      component: 'search'
    },
    {
      id: 'register',
      title: 'Register Customer',
      description: 'Register a new customer in the system',
      icon: '👤',
      component: 'register'
    },
    {
      id: 'product',
      title: 'Register Product',
      description: 'Add product details for a customer',
      icon: '📦',
      component: 'product'
    },
    {
      id: 'complaint',
      title: 'Register Complaint',
      description: 'Register a complaint for a customer product',
      icon: '📋',
      component: 'complaint'
    },
    {
      id: 'products',
      title: 'View Products',
      description: 'View all registered products',
      icon: '📱',
      component: 'products'
    },
    {
      id: 'calls',
      title: 'View Calls',
      description: 'View all registered calls and complaints',
      icon: '☎️',
      component: 'calls'
    }
  ];

  const renderContent = () => {
    const page = pages.find(p => p.id === activePage);
    if (!page) return null;

    switch (page.id) {
      case 'dashboard':
        return <DashboardContent pages={pages} onPageClick={setActivePage} />;
      case 'search':
        return <SearchForm />;
      case 'register':
        return <AddCustomerForm />;
      case 'product':
        return <RegisterProduct />;
      case 'complaint':
        return <ComplaintForm />;
      case 'products':
        return <ShowProducts />;
      case 'calls':
        return <CallUpdate />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* SIDEBAR - Shared Component */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* MAIN CONTENT */}
      <div className={`flex-1 overflow-auto transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-[20vw]'}`} style={{ marginTop: '95px' }}>
        {/* Top Bar */}
        <div className="bg-white shadow-md z-20 flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {pages.find(p => p.id === activePage)?.title}
            </h2>
          </div>
          <img src="/vite.svg" alt="Logo" className="h-8 w-8" />
        </div>

        {/* Content Area */}
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-lg">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Dashboard Content Component
function DashboardContent({ pages, onPageClick }) {
  const [stats] = React.useState({
    customers: 0,
    products: 0,
    complaints: 0,
    calls: 0
  });

  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-l-4 border-blue-600">
          <div className="text-3xl mb-2">👥</div>
          <h3 className="text-gray-600 text-sm font-semibold">Total Customers</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.customers}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-l-4 border-green-600">
          <div className="text-3xl mb-2">📦</div>
          <h3 className="text-gray-600 text-sm font-semibold">Total Products</h3>
          <p className="text-3xl font-bold text-green-600">{stats.products}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border-l-4 border-red-600">
          <div className="text-3xl mb-2">📋</div>
          <h3 className="text-gray-600 text-sm font-semibold">Total Complaints</h3>
          <p className="text-3xl font-bold text-red-600">{stats.complaints}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-l-4 border-purple-600">
          <div className="text-3xl mb-2">☎️</div>
          <h3 className="text-gray-600 text-sm font-semibold">Total Calls</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.calls}</p>
        </div>
      </div>

      <hr className="my-8" />

      {/* Quick Actions */}
      <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pages
          .filter(p => p.id !== 'dashboard')
          .map((page) => (
            <div
              key={page.id}
              onClick={() => onPageClick(page.id)}
              className="p-6 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition cursor-pointer bg-gradient-to-br from-white to-gray-50 hover:scale-105 transform"
            >
              <div className="text-4xl mb-3">{page.icon}</div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">{page.title}</h4>
              <p className="text-gray-600 text-sm mb-4">{page.description}</p>
            </div>
          ))}
      </div>

      {/* System Info */}
      <div className="mt-12 p-6 bg-blue-50 border-l-4 border-blue-600 rounded">
        <h4 className="text-lg font-bold text-gray-900 mb-3">📌 System Information</h4>
        <ul className="text-gray-600 space-y-2 text-sm">
          <li>✓ All changes are automatically saved to the database</li>
          <li>✓ Search customer by mobile number or name</li>
          <li>✓ Register new customers with complete address details</li>
          <li>✓ Track products with serial numbers and warranty status</li>
          <li>✓ Create complaints and follow up on service requests</li>
        </ul>
      </div>
    </div>
  );
}
