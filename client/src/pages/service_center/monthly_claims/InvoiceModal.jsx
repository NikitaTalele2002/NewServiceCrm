import React, { useEffect, useState, useRef } from 'react';
import Button from '../../../components/common/Button';

export default function InvoiceModal({ open, onClose, params }) {
  const { year, month, invoiceNumber, invoiceDate, centerId, complaints } = params || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const invoiceRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Only fetch when modal opened and required params are provided
    if (!year || !month || !centerId) {
      setError('Please select Year, Month, and Service Center to fetch invoice data.');
      setInvoiceData(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({
          year,
          month,
          centerId,
          invoiceNumber: invoiceNumber || '',
          invoiceDate: invoiceDate || '',
          complaints: complaints || '',
        });
        const res = await fetch(`/api/monthly-claims/invoice?${query.toString()}`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        setInvoiceData(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch invoice data');
        setInvoiceData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, year, month, invoiceNumber, invoiceDate, centerId, complaints]);

  const handlePrint = () => {
    if (!invoiceRef.current) return;
    const content = invoiceRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice</title>
          <style>
            body{font-family: Arial, Helvetica, sans-serif; padding:20px}
            .invoice-table{width:100%;border-collapse:collapse}
            .invoice-table th,.invoice-table td{border:1px solid #ddd;padding:8px;text-align:left}
            .right{text-align:right}
            .muted{color:#666;font-size:13px}
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white w-full max-w-4xl mx-4 rounded shadow-lg overflow-auto max-h-[90vh]">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold">Tax Invoice</h2>
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="success">Print</Button>
              <Button onClick={onClose} variant="secondary">Close</Button>
            </div>
          </div>

          <div ref={invoiceRef} className="text-sm text-gray-900">
            {loading && <div>Loading invoice...</div>}
            {error && <div className="text-red-600">{error}</div>}
            {!loading && !error && !invoiceData && <div className="muted">No invoice data available for selected month/year.</div>}

            {!loading && invoiceData && (
              <div>
                <div className="flex justify-between mb-4">
                  <div>
                    <strong>ASF Name</strong>
                    <div className="font-semibold mt-1">{invoiceData.asfName}</div>
                    <div className="muted whitespace-pre-line">{invoiceData.asfAddress}</div>
                    <div className="mt-2">STATE CODE : {invoiceData.stateCode}</div>
                    <div>PAN No.: {invoiceData.pan}</div>
                    <div>GST No.: {invoiceData.gst}</div>
                    <div>SAC Code: {invoiceData.sacCode || ''}</div>
                    <div>Email Id: {invoiceData.email}</div>
                    <div>Contact No.: {invoiceData.contact}</div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold">{invoiceData.vendorToLine1}</div>
                    <div className="muted whitespace-pre-line">{invoiceData.vendorTo}</div>
                    <div className="mt-2">Phone: {invoiceData.scPhone}</div>
                    <div>Branch Location: {invoiceData.branchLocation}</div>
                    <div className="mt-2">STATE CODE : {invoiceData.stateCode}</div>
                    <div>Branch GST NO : {invoiceData.branchGst}</div>
                    <div>Vendor Code: {invoiceData.vendorCode}</div>
                    <div className="mt-2">Invoice No.: {invoiceData.invoiceNo}</div>
                    <div>Invoice Date: {invoiceData.invoiceDate}</div>
                    <div>Bill Period: {invoiceData.billPeriod}</div>
                  </div>
                </div>

                <table className="invoice-table w-full mb-4 border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2">S.No.</th>
                      <th className="p-2">Description Of Goods</th>
                      <th className="p-2">No. Of Complaints</th>
                      <th className="p-2">Amount(INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(invoiceData.items) && invoiceData.items.length > 0 ? (
                      invoiceData.items.map(item => (
                        <tr key={item.sno}>
                          <td className="p-2">{item.sno}</td>
                          <td className="p-2">{item.description}</td>
                          <td className="p-2">{item.complaints}</td>
                          <td className="p-2 right">{item.amount}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="muted p-3">No items found</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="flex justify-end gap-8 mb-4">
                  <div className="w-1/3">
                    <div className="flex justify-between"><span>Total</span><span className="font-semibold">{(invoiceData.totals?.total || 0).toFixed(1)}</span></div>
                    <div className="flex justify-between"><span>Total Approved Amount</span><span>{(invoiceData.totals?.approved || 0).toFixed(1)}</span></div>
                    <div className="flex justify-between"><span>SGST 9%</span><span>{(invoiceData.totals?.sgst || 0).toFixed(1)}</span></div>
                    <div className="flex justify-between"><span>CGST 9%</span><span>{(invoiceData.totals?.cgst || 0).toFixed(1)}</span></div>
                    <div className="flex justify-between"><span>IGST 18% If Applicable</span><span>{(invoiceData.totals?.igst || 0).toFixed(1)}</span></div>
                    <div className="flex justify-between"><span>Total Tax</span><span>{(((invoiceData.totals?.sgst || 0) + (invoiceData.totals?.cgst || 0) + (invoiceData.totals?.igst || 0))).toFixed(1)}</span></div>
                    <div className="flex justify-between font-bold"><span>GRAND TOTAL</span><span>{(invoiceData.totals?.grandTotal || 0).toFixed(1)}</span></div>
                  </div>
                </div>

                <div className="mb-6">Rupees in words  :  {invoiceData.amountInWords || 'Zero'}</div>

                <div className="mb-4">Authorised Signatory:</div>

                <div className="text-sm muted">
                  <strong>Terms & Conditions :</strong>
                  <div>{invoiceData.terms || 'I/ We hereby certify that my / our registration certificate under the GST ACT is in force on the date.'}</div>
                </div>

                <div className="mt-6">
                  <strong>Action Level</strong>
                  <table className="invoice-table w-full mt-2">
                    <thead>
                      <tr>
                        <th>Action Level</th>
                        <th>Action Date</th>
                        <th>Action By</th>
                        <th>Action Status</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(invoiceData.actions) && invoiceData.actions.length > 0 ? (
                        invoiceData.actions.map((a, idx) => (
                          <tr key={idx}>
                            <td>{a.level}</td>
                            <td>{a.date}</td>
                            <td>{a.by}</td>
                            <td>{a.status}</td>
                            <td>{a.remarks}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="muted">No actions recorded</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
