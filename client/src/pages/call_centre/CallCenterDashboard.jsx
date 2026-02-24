import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';

export default function CallCenterDashboard() {
  const { user, logout } = useRole();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const pages = [
    {
      id: 'search',
      title: 'Search Customer',
      description: 'Find existing customers by mobile number or name',
      icon: '🔍',
      path: '/call-centre/search',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      id: 'register',
      title: 'Register Customer',
      description: 'Register a new customer in the system',
      icon: '👤',
      path: '/call-centre/add-customer',
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      id: 'product',
      title: 'Register Product',
      description: 'Add product details for a customer',
      icon: '📦',
      path: '/call-centre/register-product',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    },
    {
      id: 'complaint',
      title: 'Register Complaint',
      description: 'Register a complaint for a customer product',
      icon: '📋',
      path: '/call-centre/complaint',
      color: 'bg-red-50 border-red-200 hover:bg-red-100'
    },
    {
      id: 'products',
      title: 'View Products',
      description: 'View all registered products',
      icon: '📱',
      path: '/call-centre/show',
      color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
    },
    {
      id: 'calls',
      title: 'View Calls',
      description: 'View all registered calls and complaints',
      icon: '☎️',
      path: '/call-centre/call-update',
      color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Call Center Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome, {user?.username || 'Agent'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 text-black rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">👥</div>
            <h3 className="text-gray-600 text-sm">Total Customers</h3>
            <p className="text-2xl font-bold text-blue-600">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">📦</div>
            <h3 className="text-gray-600 text-sm">Total Products</h3>
            <p className="text-2xl font-bold text-green-600">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">📋</div>
            <h3 className="text-gray-600 text-sm">Total Complaints</h3>
            <p className="text-2xl font-bold text-red-600">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">☎️</div>
            <h3 className="text-gray-600 text-sm">Total Calls</h3>
            <p className="text-2xl font-bold text-indigo-600">0</p>
          </div>
        </div>

        {/* Pages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages.map((page) => (
            <Link
              key={page.id}
              to={page.path}
              className={`p-6 rounded-xl border-2 transition transform hover:scale-105 ${page.color}`}
            >
              <div className="text-5xl mb-3">{page.icon}</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{page.title}</h2>
              <p className="text-gray-600 text-sm">{page.description}</p>
              <div className="mt-4 text-blue-600 font-semibold">Go → </div>
            </Link>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-12 bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <h3 className="text-lg font-bold text-gray-900 mb-3">📌 System Information</h3>
          <ul className="text-gray-600 space-y-2">
            <li>• All changes are automatically saved to the database</li>
            <li>• Search customer by mobile number or name</li>
            <li>• Register new customers with complete address details</li>
            <li>• Track products with serial numbers and warranty status</li>
            <li>• Create complaints and follow up on service requests</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
