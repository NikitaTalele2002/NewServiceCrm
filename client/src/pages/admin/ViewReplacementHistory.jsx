import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerInformation from '../../components/call_view/CustomerInformation';
import ProductInformation from '../../components/call_view/ProductInformation';
import FormInput from '../../components/common/FormInput';
import FilterSelect from '../../components/common/FilterSelect';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';

export default function ViewReplacementHistory() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    callId: '',
    replacementStatus: '',
    requestedBy: ''
  });
  const [history, setHistory] = useState([]);
  const [selectedReplacement, setSelectedReplacement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Mock data for demonstration - replace with API call
  const mockHistory = [
    {
      id: 1,
      callId: '1234',
      product: 'Table Fan',
      serialNo: 'TF2025',
      replacementStatus: 'Approved By (RSM- Username)',
      requestedBy: 'Technician\nTechnician Name',
      createdAt: '12-12-25 11:00am',
      customer: {
        name: 'ABCD',
        mobile: '9876543211',
        altMobile: '9876543211',
        houseNo: '12',
        buildingName: 'A apartment',
        streetName: '',
        area: 'Near Ganesh Mandir',
        landmark: 'Near Ganesh Mandir',
        state: 'Maharashtra',
        city: 'Pune',
        pincode: '411048',
        customerType: 'Customer',
        customerCode: ''
      },
      productInfo: {
        branch: 'Finolex',
        productGroup: 'Fan',
        product: 'Table Fan',
        model: '000000FCESHBIN1248',
        serialNo: 'TF2025',
        purchaseDate: '',
        purchaseInvoiceNo: '',
        dealerName: '',
        warrantyStatus: '',
        warrantyStartDate: '',
        warrantyEndDate: ''
      },
      replacementInfo: {
        // Add replacement specific info if needed
      }
    },
    {
      id: 2,
      callId: '4321',
      product: 'Water Heater',
      serialNo: 'WH7856',
      replacementStatus: 'Service Tag Generated',
      requestedBy: 'ASC\nASC Name',
      createdAt: '26-05-25 12:10pm',
      customer: {
        name: 'XYZ',
        mobile: '1234567890',
        altMobile: '',
        houseNo: '',
        buildingName: '',
        streetName: '',
        area: '',
        landmark: '',
        state: '',
        city: '',
        pincode: '',
        customerType: '',
        customerCode: ''
      },
      productInfo: {
        branch: '',
        productGroup: '',
        product: '',
        model: '',
        serialNo: '',
        purchaseDate: '',
        purchaseInvoiceNo: '',
        dealerName: '',
        warrantyStatus: '',
        warrantyStartDate: '',
        warrantyEndDate: ''
      },
      replacementInfo: {}
    }
  ];

  useEffect(() => {
    // Load initial data
    setHistory(mockHistory);
  }, []);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = () => {
    // Implement search logic
    setErrorMessage('');
    setSuccessMessage('');
    console.log('Searching with filters:', filters);
    // For now, just filter mock data
    let filtered = mockHistory;
    if (filters.callId) {
      filtered = filtered.filter(h => h.callId.includes(filters.callId));
    }
    if (filters.replacementStatus) {
      filtered = filtered.filter(h => h.replacementStatus.toLowerCase().includes(filters.replacementStatus.toLowerCase()));
    }
    setHistory(filtered);
    setSuccessMessage(`Found ${filtered.length} records`);
  };

  const handleCallIdClick = (replacement) => {
    setSelectedReplacement(replacement);
  };

  const handlePrint = () => {
    // Implement print logic
    setSuccessMessage('Document sent to printer');
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="container bg-white shadow-md p-6 rounded">
        <h1 className="text-4xl font-bold mb-6 text-center">View Product Replacement</h1>

        {errorMessage && <ErrorMessage message={errorMessage} />}
        {successMessage && <div className="text-green-600 mb-4 p-3 bg-green-50 rounded">{successMessage}</div>}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border">
          <FormInput
            label="From Date"
            name="fromDate"
            type="date"
            value={filters.fromDate}
            onChange={handleFilterChange}
          />
          <FormInput
            label="To Date"
            name="toDate"
            type="date"
            value={filters.toDate}
            onChange={handleFilterChange}
          />
          <FormInput
            label="Call Id"
            name="callId"
            type="text"
            value={filters.callId}
            onChange={handleFilterChange}
            placeholder="Enter Call ID"
          />
          <FilterSelect
            label="Replacement Status"
            name="replacementStatus"
            value={filters.replacementStatus}
            onChange={(val) => setFilters({ ...filters, replacementStatus: val })}
            options={[
              { id: 'approved', label: 'Approved' },
              { id: 'service tag generated', label: 'Service Tag Generated' },
              { id: 'pending', label: 'Pending' }
            ]}
            optionValue="id"
            optionLabel="label"
          />
          <FilterSelect
            label="Requested By"
            name="requestedBy"
            value={filters.requestedBy}
            onChange={(val) => setFilters({ ...filters, requestedBy: val })}
            options={[
              { id: 'technician', label: 'Technician' },
              { id: 'asc', label: 'ASC' }
            ]}
            optionValue="id"
            optionLabel="label"
          />
          <div className="flex items-end gap-2">
            <Button
              variant="primary"
              onClick={handleSearch}
              loading={loading}
            >
              Search
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2">Call Id</th>
                <th className="border border-gray-300 p-2">Product</th>
                <th className="border border-gray-300 p-2">Serial No</th>
                <th className="border border-gray-300 p-2">Replacement Status</th>
                <th className="border border-gray-300 p-2">Requested By</th>
                <th className="border border-gray-300 p-2">Created At</th>
                <th className="border border-gray-300 p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td
                    className="border border-gray-300 p-2 cursor-pointer text-blue-600 hover:underline"
                    onClick={() => handleCallIdClick(item)}
                  >
                    {item.callId}
                  </td>
                  <td className="border border-gray-300 p-2">{item.product}</td>
                  <td className="border border-gray-300 p-2">{item.serialNo}</td>
                  <td className="border border-gray-300 p-2">{item.replacementStatus}</td>
                  <td className="border border-gray-300 p-2">{item.requestedBy}</td>
                  <td className="border border-gray-300 p-2">{item.createdAt}</td>
                  <td className="border border-gray-300 p-2">
                    {item.replacementStatus === 'Service Tag Generated' && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={handlePrint}
                      >
                        Print
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Details */}
        {selectedReplacement && (
          <div>
            {/* Adapter functions to transform data for call_view components */}
            {(() => {
              const adaptCustomerData = () => {
                return {
                  CustomerName: selectedReplacement.customer.name || '',
                  MobileNo: selectedReplacement.customer.mobile || '',
                  Email: selectedReplacement.customer.email || '',
                  HouseNo: selectedReplacement.customer.houseNo || '',
                  BuildingName: selectedReplacement.customer.buildingName || '',
                  StreetName: selectedReplacement.customer.streetName || '',
                  Landmark: selectedReplacement.customer.landmark || '',
                  Area: selectedReplacement.customer.area || '',
                  City: selectedReplacement.customer.city || '',
                  State: selectedReplacement.customer.state || '',
                  Pincode: selectedReplacement.customer.pincode || ''
                };
              };

              const adaptProductData = () => {
                return {
                  Brand: selectedReplacement.productInfo.brand || '',
                  ProductGroup: selectedReplacement.productInfo.productGroup || '',
                  Product: selectedReplacement.productInfo.product || '',
                  ModelDescription: selectedReplacement.productInfo.model || '',
                  ProductSerialNo: selectedReplacement.productInfo.serialNo || '',
                  WarrantyStatus: selectedReplacement.productInfo.warrantyStatus || '',
                  PurchaseDate: selectedReplacement.productInfo.purchaseDate || '',
                  DealerName: selectedReplacement.productInfo.dealerName || ''
                };
              };

              const customerData = adaptCustomerData();
              const productData = adaptProductData();

              return (
                <>
                  {/* Customer Information */}
                  <CustomerInformation call={customerData} />

                  <hr className="my-6" />

                  {/* Product Information */}
                  <ProductInformation call={productData} findProductGroupName={(group) => group || ''} />

                  <hr className="my-6" />

                  {/* Product Replacement Information */}
                  <h2 className="text-2xl font-bold mb-4">Product Replacement Information</h2>
                  <div>
                    {/* Add replacement specific details here */}
                    <p>Replacement details for Call ID: {selectedReplacement.callId}</p>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}