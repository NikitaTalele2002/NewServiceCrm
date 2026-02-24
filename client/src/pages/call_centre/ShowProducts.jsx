import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useShowProducts } from '../../hooks/useShowProducts';
import ProductSearchFilters from '../../components/call_centre/ProductSearchFilters';
import ProductTable from '../../components/call_centre/ProductTable';

export default function ShowProducts({ initialCustomer, customer: propCustomer }) {
  // Accept either `initialCustomer` (older usage) or `customer` prop from App.jsx
  const location = useLocation();
  const navigate = useNavigate();
  const stateCustomer = location?.state?.customer || null;
  const stateMobile = location?.state?.mobile || null;
  const customer = initialCustomer || propCustomer || stateCustomer || null;

  // Use the custom hook for all state and business logic
  const {
    filters,
    rows,
    loading,
    handleFilterChange,
    handleSearch,
    handleClearFilters,
    fetchProductsByPhoneHandler,
  } = useShowProducts(customer || stateCustomer);

  // Navigate to details page when product is selected
  const handleViewDetails = (product) => {
    navigate('/call-centre/product-details', {
      state: {
        selectedProduct: product,
        customer: customer || stateCustomer,
      },
    });
  };

  // Navigate to register product page, passing customer in state
  const handleRegisterProduct = () => {
    navigate('/call-centre/register-product', {
      state: { customer: customer || stateCustomer },
    });
  };

  // Fetch products on mount if needed
  React.useEffect(() => {
    if (stateMobile && !rows.length) {
      fetchProductsByPhoneHandler(stateMobile);
    }
  }, [stateMobile]);

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Product Management</h1>
        <p className="text-gray-600">Search and manage customer products for complaint registration</p>
      </div>

      {/* Search Filters Component */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <ProductSearchFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClearFilters}
          loading={loading}
        />
      </div>

      {/* Product Table Component */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <ProductTable
          rows={rows}
          loading={loading}
          onViewDetails={handleViewDetails}
          customer={customer || stateCustomer}
          onRegisterProduct={handleRegisterProduct}
        />
      </div>
    </div>
  );
}

