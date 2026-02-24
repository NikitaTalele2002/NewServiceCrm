import React, { useState } from 'react';
import CC_Navbar from './NavbarCS';
import CustomerSearchForm from './CustomerSearchForm';
import CustomerResultsCard from './CustomerResultsCard';
import ExistingProductsList from './ExistingProductsList';
import CustomerEditForm from './CustomerEditForm';
import CustomerRegistrationForm from './CustomerRegistrationForm';
import ProductRegistrationForm from './ProductRegistrationForm';
import ComplaintRegistrationForm from './ComplaintRegistrationForm';

export default function ServiceRegistration() {
  // Workflow states: 'search' | 'results' | 'products' | 'edit' | 'register' | 'newproduct' | 'complaint'
  const [workflow, setWorkflow] = useState('search');
  
  // Data states
  const [customer, setCustomer] = useState(null);
  const [products, setProducts] = useState([]);
  const [registeredProduct, setRegisteredProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Handle: Customer found (show results card & existing products)
  const handleCustomerFound = (customerData, productsList) => {
    setCustomer(customerData);
    setProducts(productsList || []);
    setSuccessMessage(`✓ Customer found: ${customerData.name}`);
    setWorkflow('results');
  };

  // Handle: Customer view products (or continue to new product)
  const handleViewProducts = () => {
    setWorkflow('products');
  };

  // Handle: Continue to product registration from results
  const handleContinueToProduct = () => {
    setWorkflow('newproduct');
  };

  // Handle: Edit customer from results
  const handleEditCustomer = () => {
    setSuccessMessage('');
    setWorkflow('edit');
  };

  // Handle: Customer updated in edit form
  const handleCustomerSaved = (updatedCustomer) => {
    setCustomer(updatedCustomer);
    setWorkflow('results');
    setSuccessMessage('✓ Customer details updated!');
  };

  // Handle: New customer registration
  const handleNewCustomerClick = () => {
    setWorkflow('register');
  };

  // Handle: Customer registered
  const handleCustomerCreated = (newCustomer) => {
    setCustomer(newCustomer);
    setProducts([]);
    setSuccessMessage(`✓ Customer registered: ${newCustomer.name}`);
    
    // Auto-proceed to product registration
    setTimeout(() => {
      setWorkflow('newproduct');
      setSuccessMessage('');
    }, 1500);
  };

  // Handle: Product registered
  const handleProductRegistered = (customerProduct) => {
    setRegisteredProduct(customerProduct);
    setSuccessMessage('✓ Product registered successfully!');
    
    // Auto-proceed to complaint registration
    setTimeout(() => {
      setWorkflow('complaint');
      setSuccessMessage('');
    }, 1500);
  };

  // Handle: Back to search
  const handleBackToSearch = () => {
    setWorkflow('search');
    setCustomer(null);
    setProducts([]);
    setRegisteredProduct(null);
    setSuccessMessage('');
  };

  // Handle: Add another product (same customer) from products view
  const handleAddAnotherProduct = () => {
    setRegisteredProduct(null);
    setWorkflow('newproduct');
  };

  // Handle: Select an existing product to register a complaint
  const handleSelectProductForComplaint = (product) => {
    setRegisteredProduct(product);
    setWorkflow('complaint');
  };

  // Handle: Complaint registered successfully
  const handleComplaintRegistered = () => {
    setSuccessMessage('✓ Complaint registered successfully!');
    setTimeout(() => {
      handleBackToSearch();
    }, 2000);
  };

  // Handle: Search returned no results
  const handleNoCustomerFound = () => {
    setSuccessMessage('');
    setWorkflow('register');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CC_Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-4xl">🎯</div>
            <h1 className="text-3xl font-bold text-gray-900">Complaint Registration</h1>
          </div>
          <p className="text-gray-600">
            Complete service registration: Search/Register Customer → Products → Complaint
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 animate-pulse">
            <p className="text-green-700 font-semibold">{successMessage}</p>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mb-8 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className={`text-center px-4 py-2 rounded ${['search', 'results', 'products', 'edit'].includes(workflow) ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600'}`}>
              <div className="text-sm">1️⃣ Customer</div>
            </div>
            <div className={`flex-1 h-1 mx-2 ${['products', 'newproduct', 'complaint'].includes(workflow) ? 'bg-blue-400' : 'bg-gray-300'}`}></div>
            
            <div className={`text-center px-4 py-2 rounded ${['newproduct', 'complaint'].includes(workflow) ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-600'}`}>
              <div className="text-sm">2️⃣ Product</div>
            </div>
            <div className={`flex-1 h-1 mx-2 ${workflow === 'complaint' ? 'bg-blue-400' : 'bg-gray-300'}`}></div>
            
            <div className={`text-center px-4 py-2 rounded ${workflow === 'complaint' ? 'bg-green-100 text-green-700 font-bold' : 'text-gray-600'}`}>
              <div className="text-sm">3️⃣ Complaint</div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {/* Step 1: Search Customer */}
          {workflow === 'search' && (
            <CustomerSearchForm 
              onCustomerFound={handleCustomerFound}
              onNewCustomer={handleNewCustomerClick}
              onNotFound={handleNoCustomerFound}
              loading={loading}
            />
          )}

          {/* Step 1b: Show Results (when customer found from search) */}
          {workflow === 'results' && customer && (
            <>
              <CustomerResultsCard
                customer={customer}
                onContinue={() => handleViewProducts()}
                onEdit={handleEditCustomer}
              />
              {/* Show back button */}
              <button
                onClick={handleBackToSearch}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded-lg transition"
              >
                ← Back to Search
              </button>
            </>
          )}

          {/* Step 1c: View Existing Products */}
          {workflow === 'products' && customer && (
            <>
              <ExistingProductsList
                products={products}
                customer={customer}
                onContinue={handleAddAnotherProduct}
                onRegisterComplaint={handleSelectProductForComplaint}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setWorkflow('results')}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 px-4 rounded-lg transition"
                >
                  ← Back to Details
                </button>
                <button
                  onClick={handleBackToSearch}
                  className="flex-1 bg-orange-400 hover:bg-orange-500 text-black font-semibold py-2 px-4 rounded-lg transition"
                >
                  🔄 Back to Search
                </button>
              </div>
            </>
          )}

          {/* Step 1d: Edit Customer Details */}
          {workflow === 'edit' && customer && (
            <CustomerEditForm
              customer={customer}
              onSave={handleCustomerSaved}
              onCancel={() => setWorkflow('results')}
              loading={loading}
            />
          )}

          {/* Step 2: Register New Customer (if not found) */}
          {workflow === 'register' && (
            <CustomerRegistrationForm 
              onCustomerCreated={handleCustomerCreated}
              onCancel={() => setWorkflow('search')}
              loading={loading}
            />
          )}

          {/* Step 3: Register New Product */}
          {workflow === 'newproduct' && customer && (
            <>
              {registeredProduct && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-700 font-semibold">
                    ✓ Product "{registeredProduct.serial_no}" registered for {customer.name}
                  </p>
                </div>
              )}
              <ProductRegistrationForm 
                customer={customer}
                onProductRegistered={handleProductRegistered}
                onCancel={handleBackToSearch}
                loading={loading}
              />
            </>
          )}

          {/* Step 4: Register Complaint */}
          {workflow === 'complaint' && customer && registeredProduct && (
            <ComplaintRegistrationForm 
              customer={customer}
              product={registeredProduct}
              onComplaintRegistered={handleComplaintRegistered}
              onAddAnotherProduct={handleAddAnotherProduct}
              onBackToSearch={handleBackToSearch}
            />
          )}
        </div>

        {/* Info Box */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 Complete Workflow</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✓ <strong>Step 1:</strong> Search existing customer (mobile, name, code, location)</li>
            <li>✓ <strong>View Products:</strong> See all registered products and warranty status</li>
            <li>✓ <strong>Edit:</strong> Update customer data if needed</li>
            <li>✓ <strong>Fallback:</strong> If not found, register new customer</li>
            <li>✓ <strong>Step 2:</strong> Register new product for the customer</li>
            <li>✓ <strong>Step 3:</strong> Register service complaint for the product</li>
            <li>✓ You can register multiple products before registering complaint</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
