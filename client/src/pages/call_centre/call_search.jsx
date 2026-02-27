import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import FormInput from "../../components/common/FormInput";
import FilterSelect from "../../components/common/FilterSelect";
import Button from "../../components/common/Button";
import CC_Navbar from "../call_centre/NavbarCS";
import CallView from "./CallView";

export default function CallSearch() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    callId: "",
    mobileNo: "",
    brand: "",
    status: "",
    callType: "",
  });

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [showView, setShowView] = useState(false);

  useEffect(() => {
    const callId = searchParams.get('callId');
    if (callId) {
      // Fetch calls if not already fetched
      if (results.length === 0) {
        handleSearch({ preventDefault: () => {} });
      } else {
        const call = results.find(r => String(r.ComplaintId) === String(callId) || String(r.CallId) === String(callId));
        if (call) {
          setSelectedCall(call);
          setShowView(true);
        }
      }
    }
  }, [searchParams, results]);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleViewDetails = () => {
    if (selectedCall) {
      const call = results.find(r => r.CallId === selectedCall);
      setSelectedCall(call);
      setShowView(true);
    } else {
      alert('Please select a call to view details.');
    }
  };

 
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/complaints'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setResults(data.complaints || []);
      } else {
        alert('Failed to fetch calls');
      }
    } catch (error) {
      console.error('Error fetching calls:', error);
      alert('Error fetching calls');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gray-50">
      <CC_Navbar />

      <div className="container mt-10 bg-white p-8 shadow-md rounded-lg">
        <h1 className="text-xl font-bold mb-6 text-gray-800 text-center">Call Management - Call Search</h1>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <FormInput
            type="date"
            label="From Date"
            name="fromDate"
            value={filters.fromDate}
            onChange={handleChange}
          />

          <FormInput
            type="date"
            label="To Date"
            name="toDate"
            value={filters.toDate}
            onChange={handleChange}
          />

          <FormInput
            type="text"
            label="Call ID"
            name="callId"
            value={filters.callId}
            onChange={handleChange}
            placeholder="0511250065"
          />

          <FormInput
            type="text"
            label="Mobile No"
            name="mobileNo"
            value={filters.mobileNo}
            onChange={handleChange}
            placeholder="Enter mobile number"
          />

          <FilterSelect
            label="Brand"
            name="brand"
            value={filters.brand}
            onChange={(value) => setFilters({ ...filters, brand: value })}
            options={[
              { id: '', label: 'Select' },
              { id: 'FINOLEX', label: 'FINOLEX' }
            ]}
            optionValue="id"
            optionLabel="label"
          />

          <FilterSelect
            label="Status"
            name="status"
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
            options={[
              { id: '', label: 'All' },
              { id: 'Open', label: 'Open' },
              { id: 'Closed', label: 'Closed' }
            ]}
            optionValue="id"
            optionLabel="label"
          />

          <FilterSelect
            label="Call Type"
            name="callType"
            value={filters.callType}
            onChange={(value) => setFilters({ ...filters, callType: value })}
            options={[
              { id: '', label: 'All' },
              { id: 'Repair', label: 'Service' },
              { id: 'Installation', label: 'Installation' }
            ]}
            optionValue="id"
            optionLabel="label"
          />

          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </form>

        {/* Results Table */}
        {results.length > 0 && (
          <div className="overflow-x-auto mt-8">
            <table className="min-w-full border border-gray-300 text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="border px-2 py-1">#</th>
                  <th className="border px-2 py-1">Select</th>
                  <th className="border px-2 py-1">Call Id</th>
                  <th className="border px-2 py-1">Age</th>
                  <th className="border px-2 py-1">Registration Date</th>
                  <th className="border px-2 py-1">Appointment Date</th>
                  <th className="border px-2 py-1">Status</th>
                  <th className="border px-2 py-1">Customer Name</th>
                  <th className="border px-2 py-1">Address</th>
                  <th className="border px-2 py-1">State</th>
                  <th className="border px-2 py-1">City</th>
                  <th className="border px-2 py-1">Pin Code</th>
                  <th className="border px-2 py-1">Mobile No</th>
                  <th className="border px-2 py-1">Brand</th>
                  <th className="border px-2 py-1">Model</th>
                  <th className="border px-2 py-1">Warranty</th>
                  <th className="border px-2 py-1">Customer Remarks</th>
                  <th className="border px-2 py-1">Branch</th>
                  <th className="border px-2 py-1">ASP/DSA</th>
                  <th className="border px-2 py-1">Technician</th>
                  <th className="border px-2 py-1">Contact Person</th>
                  <th className="border px-2 py-1">Contact No</th>
                  <th className="border px-2 py-1">Call Type</th>
                  <th className="border px-2 py-1">Remarks</th>
                  <th className="border px-2 py-1">Caller Type</th>
                  <th className="border px-2 py-1">Pending Reason</th>
                  <th className="border px-2 py-1">Cancel Reason</th>
                  <th className="border px-2 py-1">Call Closed Date</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, index) => (
                  <tr
                    key={index}
                    className={`text-center hover:bg-gray-50 ${
                      selectedCall === r.CallId ? "bg-teal-100" : ""
                    }`}>
                    <td className="border px-2 py-1">{index + 1}</td>
                    <td className="border px-2 py-1">
                      <input
                        type="radio"
                        name="selectedCall"
                        checked={selectedCall === r.CallId}
                        onChange={() => setSelectedCall(r.CallId)}/>
                    </td>
                    <td className="border px-2 py-1">{r.CallId}</td>
                    <td className="border px-2 py-1">{r.Age}</td>
                    <td className="border px-2 py-1">{r.RegistrationDate}</td>
                    <td className="border px-2 py-1">{r.AppointmentDate}</td>
                    <td className="border px-2 py-1">{r.Status}</td>
                    <td className="border px-2 py-1">{r.CustomerName}</td>
                    <td className="border px-2 py-1">{r.Address}</td>
                    <td className="border px-2 py-1">{r.State}</td>
                    <td className="border px-2 py-1">{r.City}</td>
                    <td className="border px-2 py-1">{r.PinCode}</td>
                    <td className="border px-2 py-1">{r.MobileNo}</td>
                    <td className="border px-2 py-1">{r.Brand}</td>
                    <td className="border px-2 py-1">{r.Model}</td>
                    <td className="border px-2 py-1">{r.Warranty}</td>
                    <td className="border px-2 py-1">{r.CustomerRemarks}</td>
                    <td className="border px-2 py-1">{r.Branch}</td>
                    <td className="border px-2 py-1">{r.ASP_DSA}</td>
                    <td className="border px-2 py-1">{r.Technician}</td>
                    <td className="border px-2 py-1">{r.ContactPerson}</td>
                    <td className="border px-2 py-1">{r.ContactNo}</td>
                    <td className="border px-2 py-1">{r.CallType}</td>
                    <td className="border px-2 py-1">{r.Remarks}</td>
                    <td className="border px-2 py-1">{r.CallerType}</td>
                    <td className="border px-2 py-1">{r.PendingReason}</td>
                    <td className="border px-2 py-1">{r.CancelReason}</td>
                    <td className="border px-2 py-1">{r.CallClosedDate || "-"}</td>
                  </tr>
                  
                ))}
                <tr>
                  <td colSpan="25" className="border px-2 py-3 text-center space-x-2">
                    <Button 
                      type="button"
                      variant="primary"
                      onClick={handleViewDetails}
                    >
                      View Details
                    </Button>
                    <Button 
                      type="submit"
                      variant="success"
                    >
                      Submit Complaint
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {loading && <p className="text-center text-gray-600 mt-4">Loading...</p>}
      </div>

      {showView && selectedCall && (
        <div className="mt-8">
          <CallView call={selectedCall} />
          <Button
            onClick={() => setShowView(false)}
            variant="secondary"
            className="mt-4"
          >
            Close View
          </Button>
        </div>
      )}
    </div>
  );
}