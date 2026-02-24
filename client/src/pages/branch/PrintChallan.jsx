import React, { useState, useEffect } from 'react';
import Button from '../../components/common/Button';

const PrintChallan = () => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [challanData, setChallanData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReturnRequests();
  }, []);

  const fetchReturnRequests = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to access this page');
      return;
    }
    try {
      const response = await fetch('/api/returns/branch-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch return requests');
      const data = await response.json();
      setRequests(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching return requests:', error);
      setError('Failed to load return requests');
    }
  };

  const handleRequestChange = async (e) => {
    const requestId = e.target.value;
    if (!requestId) {
      setSelectedRequest(null);
      setChallanData(null);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to access this page');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/returns/branch-requests/${requestId}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch request details');
      const data = await response.json();
      setSelectedRequest(data);
      // Assuming the response has items with invoice details
      setChallanData({
        requestNumber: data.requestId,
        masterCartons: data.masterCartons || 1, // Placeholder
        items: data.items.map(item => ({
          partCode: item.sku,
          partDescription: item.spareName,
          returnQty: item.requestedQty,
          invoiceNo: item.invoiceNo || 'N/A',
          invoiceDate: item.invoiceDate || 'N/A',
          amount: item.amount || 0
        }))
      });
    } catch (error) {
      console.error('Error fetching request details:', error);
      setError('Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totalAmount = challanData ? challanData.items.reduce((sum, item) => sum + (item.amount || 0), 0) : 0;

  return (
    <div className="p-5 font-sans">
      <div className="mb-5">
        <label className="mr-2.5" style={{ fontSize: '32px' }}>
          Spare Part Return Request No.:
        </label>
        <select
          value={selectedRequest ? selectedRequest.id : ''}
          onChange={handleRequestChange}
          className="p-2 border border-gray-300 rounded"
          style={{ fontSize: '32px', width: '300px' }}
        >
          <option value="">Select</option>
          {requests.map(req => (
            <option key={req.id} value={req.id}>{req.requestId}</option>
          ))}
        </select>
      </div>

      {challanData && (
        <>
          <div className="mb-5">
            <label className="mr-2.5" style={{ fontSize: '32px' }}>
              No. Of Master Cartons:
            </label>
            <input
              type="number"
              value={challanData.masterCartons}
              readOnly
              className="p-2 border border-gray-300 rounded"
              style={{ fontSize: '32px', width: '100px' }}
            />
          </div>

          <div className="border-2 border-black p-2.5">
            <h2 className="text-center m-0" style={{ fontSize: '44px' }}>Return Cart</h2>
            <table className="w-full border-collapse mt-5">
              <thead>
                <tr>
                  <th className="border-2 border-black p-2.5 text-left" style={{ fontSize: '32px' }}>Part Code</th>
                  <th className="border-2 border-black p-2.5 text-left" style={{ fontSize: '32px' }}>Part Description</th>
                  <th className="border-2 border-black p-2.5 text-left" style={{ fontSize: '32px' }}>Return QTY</th>
                  <th className="border-2 border-black p-2.5 text-left" style={{ fontSize: '32px' }}>Invoice No.</th>
                  <th className="border-2 border-black p-2.5 text-left" style={{ fontSize: '32px' }}>Invoice Date</th>
                  <th className="border-2 border-black p-2.5 text-left" style={{ fontSize: '32px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {challanData.items.map((item, index) => (
                  <tr key={index}>
                    <td className="border-2 border-black p-2.5" style={{ fontSize: '20px' }}>{item.partCode}</td>
                    <td className="border-2 border-black p-2.5" style={{ fontSize: '20px' }}>{item.partDescription}</td>
                    <td className="border-2 border-black p-2.5" style={{ fontSize: '20px' }}>{item.returnQty}</td>
                    <td className="border-2 border-black p-2.5" style={{ fontSize: '20px' }}>{item.invoiceNo}</td>
                    <td className="border-2 border-black p-2.5" style={{ fontSize: '20px' }}>{item.invoiceDate}</td>
                    <td className="border-2 border-black p-2.5" style={{ fontSize: '20px' }}>{item.amount}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan="5" className="border-2 border-black p-2.5 text-right font-bold" style={{ fontSize: '35px' }}>Total</td>
                  <td className="border-2 border-black p-2.5" style={{ fontSize: '33px' }}>{totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-right mt-5">
            <Button
              onClick={handlePrint}
              variant="primary"
              className="text-lg"
            >
              Print
            </Button>
          </div>
        </>
      )}

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
};

export default PrintChallan;