import React from 'react';
import CustomerInformation from '../../components/call_view/CustomerInformation';
import ProductInformation from '../../components/call_view/ProductInformation';

export default function ProductDetailsModal({
  selectedProduct,
  customer,
  callInfo,
  onCallInfoChange,
  onClose,
  onAssignCenter,
  onSubmitComplaint,
  assigning,
  submitting
}) {
  if (!selectedProduct) return null;

  const handleCallInfoChange = (field, value) => {
    onCallInfoChange({ ...callInfo, [field]: value });
  };

  // Adapter functions to transform data for call_view components
  const adaptCustomerData = () => {
    const cust = customer || selectedProduct.Customer || {};
    return {
      CustomerName: cust.Name || '',
      MobileNo: cust.MobileNo || '',
      Email: cust.Email || '',
      HouseNo: cust.HouseNumber || '',
      BuildingName: cust.BuildingName || '',
      StreetName: cust.StreetName || '',
      Landmark: cust.Landmark || '',
      Area: cust.Area || '',
      City: cust.City || '',
      State: cust.State || '',
      Pincode: cust.PinCode || ''
    };
  };

  const adaptProductData = () => {
    return {
      Brand: selectedProduct.Brand || '',
      ProductGroup: selectedProduct.ProductGroupName || selectedProduct.ProductGroup || '',
      Product: selectedProduct.ProductName || '',
      ModelDescription: selectedProduct.ModelName || selectedProduct.Model || '',
      ProductSerialNo: selectedProduct.ProductSerialNo || '',
      WarrantyStatus: selectedProduct.WarrantyStatus || '',
      PurchaseDate: selectedProduct.PurchaseDate || '',
      DealerName: selectedProduct.DealerName || ''
    };
  };

  const customerData = adaptCustomerData();
  const productData = adaptProductData();

  return (
    <div className="mt-6 p-4 border rounded bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Selected Product Details</h3>
        <button
          onClick={onClose}
          className="text-sm px-2 py-1 border rounded hover:bg-gray-200"
        >
          Close
        </button>
      </div>

      {/* Customer Info */}
      <CustomerInformation call={customerData} />

      {/* Product Info */}
      <ProductInformation call={productData} findProductGroupName={(group) => group || ''} />

      {/* Call Information */}
      <div className="mb-4">
        <h4 className="font-semibold">Call Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <div>
            <label className="block text-sm font-medium">Call Type *</label>
            <select
              value={callInfo.CallType}
              onChange={(e) => handleCallInfoChange('CallType', e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select</option>
              <option value="Installation">Installation</option>
              <option value="Service">Service</option>
              <option value="Demo">Demo</option>
              <option value="DCF">DCF</option>
              <option value="Replacement">Replacement</option>
              <option value="Distributor/Dealer stock check">Distributor/Dealer stock check</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Qty</label>
            {callInfo.CallType === "Distributor/Dealer stock check" ? (
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!callInfo.Bulk}
                  onChange={(e) => handleCallInfoChange('Bulk', e.target.checked)}
                />
                <span>Bulk</span>
              </label>
            ) : (
              <input
                type="number"
                min={1}
                value={callInfo.Qty}
                onChange={(e) => handleCallInfoChange('Qty', Number(e.target.value))}
                className="w-full p-2 border rounded"
              />
            )}
          </div>

          {callInfo.CallType === "Other" && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">Other (please describe)</label>
              <textarea
                value={callInfo.OtherReason}
                onChange={(e) => handleCallInfoChange('OtherReason', e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium">Caller Mobile *</label>
            <input
              value={callInfo.CallerMobile}
              onChange={(e) => handleCallInfoChange('CallerMobile', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Appointment Date</label>
            <input
              type="date"
              value={callInfo.AppointmentDate}
              onChange={(e) => handleCallInfoChange('AppointmentDate', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Appointment Time</label>
            <select
              value={callInfo.AppointmentTime}
              onChange={(e) => handleCallInfoChange('AppointmentTime', e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Time Slot</option>
              <option value="9-10 AM">9-10 AM</option>
              <option value="10-11 AM">10-11 AM</option>
              <option value="11-12 PM">11-12 PM</option>
              <option value="12-1 PM">12-1 PM</option>
              <option value="1-2 PM">1-2 PM</option>
              <option value="2-3 PM">2-3 PM</option>
              <option value="3-4 PM">3-4 PM</option>
              <option value="4-5 PM">4-5 PM</option>
              <option value="5-6 PM">5-6 PM</option>
              <option value="6-7 PM">6-7 PM</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Customer Remarks *</label>
            <textarea
              value={callInfo.CustomerRemarks}
              onChange={(e) => handleCallInfoChange('CustomerRemarks', e.target.value)}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Dealer Name</label>
            <input
              value={callInfo.DealerName}
              onChange={(e) => handleCallInfoChange('DealerName', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Call Source</label>
            <select
              value={callInfo.CallSource}
              onChange={(e) => handleCallInfoChange('CallSource', e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option>Voice</option>
              <option>WhatsApp</option>
              <option>Online</option>
              <option>Email</option>
            </select>
          </div>

          <div className="md:col-span-2 flex gap-2 mt-2">
            <button
              disabled={assigning}
              onClick={onAssignCenter}
              className="bg-yellow-600 text-black px-4 py-2 rounded disabled:opacity-50"
            >
              {assigning ? "Assigning..." : "Assign Nearest Service Center"}
            </button>

            <button
              disabled={submitting}
              onClick={onSubmitComplaint}
              className="bg-green-600 text-black px-4 py-2 rounded disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Complaint"}
            </button>
          </div>

          {callInfo.AssignedCenter && (
            <>
              <div>
                <label className="block text-sm font-medium">Assigned Center</label>
                <input
                  readOnly
                  value={callInfo.AssignedCenter}
                  className="w-full p-2 border rounded font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Distance (km)</label>
                <input
                  readOnly
                  value={callInfo.Distance}
                  className="w-full p-2 border rounded font-semibold"
                />
              </div>

              {callInfo.OutCity && (
                <div className="md:col-span-2 text-red-600 font-bold">OUT CITY CALL</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}