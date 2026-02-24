import React, { useState } from 'react';
import { useRole } from '../../context/RoleContext';
import Loader from '../../components/Loader';
import FormInput from '../../components/common/FormInput';
import FilterSelect from '../../components/common/FilterSelect';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import SuccessMessage from '../../components/common/SuccessMessage';

export default function MasterUpload() {
  const { role, isLoading } = useRole();
  if (isLoading) return <Loader />;

  // Main state
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'upload', or 'edit'
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Upload states
  const [file, setFile] = useState(null);
  const [type, setType] = useState('group');
  const [mode, setMode] = useState('replace');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [preview, setPreview] = useState(null);

  // Edit states
  const [masterData, setMasterData] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editMessage, setEditMessage] = useState('');
  const [editType, setEditType] = useState('group');
  const [availableStates, setAvailableStates] = useState([]);
  const [availableProductGroups, setAvailableProductGroups] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableProductModels, setAvailableProductModels] = useState([]);
  const [isCreatingNewRecord, setIsCreatingNewRecord] = useState(false);

  if (role !== 'admin') 
    return <div className="p-6 text-center text-red-600 font-semibold">Unauthorized - Admin access required</div>;

  const typeLabels = {
    state: "State Master",
    cities: "Cities Master",
    pincode: "Pincode Master",
    productgroups: "Product Groups Master",
    models: "Product Models Master",
    spareparts: "Spare Parts Master",
    group: "Group Master",
    product: "Product Master",
    banks: "Banks",
    callsources: "Call Sources",
    documenttype: "Document Type",
    calltype: "Call Type",
    cancelreason: "Cancel Reason",
    couriers: "Couriers",
    languages: "Languages",
    customertype: "Customer Type",
    roles: "Roles",
    zones: "Zones",
  };

  const excelGuidelines = {
    state: "Columns: ID, VALUE, DESCRIPTION",
    cities: "Columns: ID, VALUE, DESCRIPTION, City_ID",
    pincode: "Columns: ID, VALUE, DESCRIPTION, City_ID",
    productgroups: "Columns: ID, VALUE, DESCRIPTION",
    models: "Columns: BRAND, PRODUCT, MODEL_CODE, MODEL_DESCRIPTION, PRICE, SERIALIZED_FLAG, WARRANTY_IN_MONTHS, VALID_FROM",
    spareparts: "Columns: BRAND, PART, DESCRIPTION, MAPPED_MODEL, MODEL_DESCRIPTION, MAX_USED_QTY, SERVICE_LEVEL, PART_LOCATION, STATUS, LAST_UPDATED_DATE",
    group: "Columns: GroupCode, GroupName",
    product: "Columns: ID, VALUE, DESCRIPTION, ProductGroupID",
    banks: "Columns: ID, VALUE, DESCRIPTION, PARENT_ID, PARENT_DESCRIPTION",
    callsources: "Columns: ID, VALUE, DESCRIPTION, PARENT_ID, PARENT_DESCRIPTION",
    documenttype: "Columns: ID, VALUE, DESCRIPTION, PARENT_ID, PARENT_DESCRIPTION",
    calltype: "Columns: ID, VALUE, DESCRIPTION, PARENT_ID, PARENT_DESCRIPTION",
    cancelreason: "Columns: ID, VALUE, DESCRIPTION, PARENT_ID, PARENT_DESCRIPTION",
    couriers: "Columns: ID, VALUE, DESCRIPTION, PARENT_ID, PARENT_DESCRIPTION",
    languages: "Columns: ID, VALUE, DESCRIPTION, PARENT_ID, PARENT_DESCRIPTION",
    customertype: "Columns: ID, VALUE, DESCRIPTION, PARENT_ID, PARENT_DESCRIPTION",
    roles: "Columns: ID, VALUE, DESCRIPTION, PARENT_ID, PARENT_DESCRIPTION",
    zones: "Columns: ID, VALUE, DESCRIPTION, PARENT_ID, PARENT_DESCRIPTION",
  };

  // ============ UPLOAD FUNCTIONS ============
  async function upload() {
    if (!file) {
      setErrorMessage('Please select an Excel file');
      return;
    }
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setErrorMessage('Only Excel files (.xlsx, .xls) are supported');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);

    try {
      const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000' : '';
      const url = `${API_BASE}/api/admin/upload-master?mode=${encodeURIComponent(mode || '')}`;
      const res = await fetch(url, { method: 'POST', body: form });

      let js = null;
      try {
        js = await res.json();
      } catch (parseErr) {
        js = { message: res.statusText || 'Upload complete' };
      }
      setMessage(js.message || 'Upload complete');
      setSuccessMessage('File uploaded successfully!');
      setResults(js.results);
      setPreview(js.preview || null);
      setFile(null);

    } catch (e) {
      console.error(e);
      setErrorMessage('Upload failed: ' + (e.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  // ============ EDIT FUNCTIONS ============
  async function fetchMasterData() {
    setEditLoading(true);
    setEditMessage('');
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const res = await fetch(`http://localhost:5000/api/admin/master-data?type=${editType}`, { headers });
      const data = await res.json();
      setMasterData(Array.isArray(data) ? data : data.rows || data.data || []);

      if (editType === 'cities') {
        const statesRes = await fetch(`http://localhost:5000/api/admin/master-data?type=state`, { headers });
        const statesData = await statesRes.json();
        setAvailableStates(Array.isArray(statesData) ? statesData : statesData.rows || statesData.data || []);
      }

      if (editType === 'product') {
        const pgRes = await fetch(`http://localhost:5000/api/admin/master-data?type=productgroups`, { headers });
        const pgData = await pgRes.json();
        setAvailableProductGroups(Array.isArray(pgData) ? pgData : pgData.rows || pgData.data || []);
      }

      if (editType === 'models') {
        const pRes = await fetch(`http://localhost:5000/api/admin/master-data?type=product`, { headers });
        const pData = await pRes.json();
        setAvailableProducts(Array.isArray(pData) ? pData : pData.rows || pData.data || []);
      }

      if (editType === 'spareparts') {
        const pmRes = await fetch(`http://localhost:5000/api/admin/master-data?type=models`, { headers });
        const pmData = await pmRes.json();
        const rows = Array.isArray(pmData) ? pmData : pmData.rows || pmData.data || [];
        const norm = rows.map(m => ({
          id: (m.Id ?? m.ID ?? m.id) && String(m.Id ?? m.ID ?? m.id).trim(),
          name: m.MODEL_CODE ?? m.MODEL ?? m.Value ?? m.MODEL_DESCRIPTION ?? String(m),
          ProductID: (m.ProductID ?? m.Product ?? m.ProductId) && String(m.ProductID ?? m.Product ?? m.ProductId).trim()
        }));
        setAvailableProductModels(norm);
      }
    } catch (err) {
      setEditMessage('Failed to load master data: ' + err.message);
      setMasterData([]);
    } finally {
      setEditLoading(false);
    }
  }

  function handleEditRowClick(row) {
    setSelectedRow(row);
    setEditFormData({ ...row });
  }

  async function saveEditedRow() {
    if (!selectedRow) {
      setErrorMessage('Please select a row to edit');
      return;
    }
    if (!editFormData || Object.keys(editFormData).length === 0) {
      setErrorMessage('No changes to save');
      return;
    }

    setEditLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      const isNewRecord = !selectedRow.Id && !selectedRow.id;
      const method = isNewRecord ? 'POST' : 'PUT';
      const url = isNewRecord 
        ? `http://localhost:5000/api/admin/master-data/${editType}`
        : `http://localhost:5000/api/admin/master-data/${editType}/${selectedRow.Id || selectedRow.id}`;

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(editFormData)
      });

      const result = await res.json();
      if (res.ok) {
        const successMsg = isNewRecord ? 'Record created successfully' : 'Record updated successfully';
        setSuccessMessage(successMsg);
        setEditMessage('✓ ' + successMsg);
        
        if (isNewRecord) {
          setMasterData(prev => [result.data, ...prev]);
          setIsCreatingNewRecord(false);
        } else {
          setMasterData(prev => prev.map(item => 
            (item.Id || item.id) === (selectedRow.Id || selectedRow.id) ? editFormData : item
          ));
        }
        setSelectedRow(null);
        setEditFormData({});
      } else {
        const errorMsg = 'Error: ' + (result.message || result.error || 'Failed to save');
        setErrorMessage(errorMsg);
        setEditMessage(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Save failed: ' + err.message;
      setErrorMessage(errorMsg);
      setEditMessage(errorMsg);
    } finally {
      setEditLoading(false);
    }
  }

  function handleFieldChange(field, value) {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  }

  function addNewRow() {
    const newRow = {};
    Object.keys(masterData[0] || {}).forEach(key => {
      newRow[key] = '';
    });
    setIsCreatingNewRecord(true);
    handleEditRowClick(newRow);
  }

  async function deleteRow(row) {
    if (!window.confirm('Are you sure you want to delete this record?')) return;

    setEditLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      const res = await fetch(`http://localhost:5000/api/admin/master-data/${editType}/${row.Id || row.id}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        setEditMessage('Record deleted successfully');
        setMasterData(prev => prev.filter(item => (item.Id || item.id) !== (row.Id || row.id)));
        setSelectedRow(null);
      } else {
        const result = await res.json();
        setEditMessage('Error: ' + (result.message || 'Failed to delete'));
      }
    } catch (err) {
      setEditMessage('Delete failed: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  }

  // ================= RENDER =================
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Side Panel */}
      <div className="w-64 bg-white border-r border-gray-300 p-6 shadow-md flex flex-col">
        <h2 className="text-2xl font-bold mb-8 text-gray-800">Master Data</h2>
        
        <Button
          onClick={() => setActiveView('dashboard')}
          variant={activeView === 'dashboard' ? 'primary' : 'secondary'}
          className="w-full mb-3 justify-start">
          Dashboard
        </Button>

        <Button
          onClick={() => setActiveView('upload')}
          variant={activeView === 'upload' ? 'primary' : 'secondary'}
          className="w-full mb-3 justify-start">
          Upload Master
        </Button>

        <Button
          onClick={() => setActiveView('edit')}
          variant={activeView === 'edit' ? 'primary' : 'secondary'}
          className="w-full mb-3 justify-start">
          Edit Master
        </Button>

        <div className="mt-auto pt-6 border-t border-gray-300">
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <p className="text-sm font-semibold text-gray-800 mb-1">Tip:</p>
            <p className="text-xs text-gray-700 leading-relaxed">
              Use Upload to bulk import data, or Edit to manage individual records.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {/* DASHBOARD VIEW */}
        {activeView === 'dashboard' && (
          <div className="p-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-3">Admin Dashboard</h1>
            <p className="text-gray-600 mb-10 text-lg">Welcome to master data management. Select an option from the left panel.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div 
                onClick={() => setActiveView('upload')}
                className="p-8 bg-white rounded-xl border-2 border-blue-300 shadow-lg hover:shadow-xl transition cursor-pointer hover:scale-105 transform">
                <h3 className="text-3xl font-bold text-blue-600 mb-3">Upload Master</h3>
                <p className="text-gray-700 mb-6 leading-relaxed">Import Excel files to bulk update master data. Choose between Replace All or Append mode for flexible data management.</p>
                <Button 
                  onClick={() => setActiveView('upload')} 
                  variant="primary"
                >
                  Start Uploading
                </Button>
              </div>

              <div 
                onClick={() => setActiveView('edit')}
                className="p-8 bg-white rounded-xl border-2 border-green-300 shadow-lg hover:shadow-xl transition cursor-pointer hover:scale-105 transform">
                <h3 className="text-3xl font-bold text-green-600 mb-3">Edit Master</h3>
                <p className="text-gray-700 mb-6 leading-relaxed">View and manage individual master data records. Add new records, edit existing ones, or delete as needed.</p>
                <Button 
                  onClick={() => setActiveView('edit')} 
                  variant="success">
                  Start Editing
                </Button>
              </div>
            </div>
          </div>
        )}

         {/* Upload Master View */}
        {activeView === 'upload' && (
          <div className="p-8 max-w-5xl">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Upload Master Data</h1>
              <p className="text-gray-600 text-lg">Bulk import master data from Excel files</p>
            </div>

            {errorMessage && <ErrorMessage message={errorMessage} />}
            {successMessage && <SuccessMessage message={successMessage} />}

            <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FilterSelect
                  label="Select Data Type"
                  value={type}
                  onChange={setType}
                  options={Object.entries(typeLabels).map(([key, label]) => ({ id: key, label }))}
                  optionValue="id"
                  optionLabel="label"
                />

                <FilterSelect
                  label="Upload Mode"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { id: 'replace', label: 'Replace All Data' },
                    { id: 'append', label: 'Append Data' }
                  ]}
                  optionValue="id"
                  optionLabel="label"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Excel File</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full border-2 border-dashed border-gray-400 p-4 rounded-lg cursor-pointer hover:border-blue-400 transition"
                />
                {file && <p className="text-sm text-green-600 mt-2 font-semibold">Selected: {file.name}</p>}
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={upload}
                loading={loading}
              >
                {loading ? 'Uploading...' : 'Upload File'}
              </Button>

              {message && (
                <div className={`p-4 rounded-lg font-semibold text-lg ${message.includes('failed') ? 'bg-red-100 text-red-800 border-2 border-red-400' : 'bg-green-100 text-green-800 border-2 border-green-400'}`}>
                  {message}
                </div>
              )}

              {results && (
                <div className="p-6 border-2 border-gray-300 rounded-lg bg-gray-50">
                  <p className="font-bold text-lg mb-3">Upload Results:</p>
                  <p className="text-gray-800">Processed: <span className="font-semibold">{results.processed}</span> records</p>
                  <p className="text-gray-800">Uploaded: <span className="font-semibold">{results.uploaded}</span> records</p>
                  {results.deleted > 0 && <p className="text-gray-800">Deleted: <span className="font-semibold">{results.deleted}</span> records</p>}
                  <p className="text-gray-800 mt-2">Mode: <span className="font-bold">{results.mode === 'replace' ? 'Replace' : 'Append'}</span></p>
                </div>
              )}

              {preview && (
                <div className="overflow-auto border-2 border-gray-300 rounded-lg bg-white">
                  <p className="font-bold text-lg p-4 border-b bg-gray-50">Preview ({preview.length} rows)</p>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        {Object.keys(preview[0]).map((k) => (
                          <th key={k} className="px-4 py-3 border text-left font-bold">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 10).map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {Object.keys(preview[0]).map((k) => (
                            <td key={k} className="px-4 py-3 border text-gray-700">{String(row[k] ?? '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-300">
                <p className="text-sm font-bold text-blue-900 mb-2">Excel Format Required:</p>
                <p className="text-sm text-blue-800 font-semibold">{excelGuidelines[type]}</p>
              </div>
            </div>
          </div>
        )}

        {/* EDIT VIEW */}
        {/* Edit Master View */}
{activeView === 'edit' && (
  <div className="p-8 max-w-7xl">
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-2">Edit Master Data</h1>
      <p className="text-gray-600 text-lg">View, add, edit, and delete individual records</p>
    </div>

    {errorMessage && <ErrorMessage message={errorMessage} />}
    {successMessage && <SuccessMessage message={successMessage} />}

    <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FilterSelect
          label="Select Data Type"
          value={editType}
          onChange={(val) => {
            setEditType(val);
            setSelectedRow(null);
            setEditFormData({});
            setMasterData([]);
          }}
          options={Object.entries(typeLabels).map(([key, label]) => ({ id: key, label }))}
          optionValue="id"
          optionLabel="label"
        />

        <Button
          onClick={fetchMasterData}
          variant="success"
          loading={editLoading}
        >
          {editLoading ? 'Loading...' : 'Load Data'}
        </Button>
      </div>

      {editMessage && (
        <div
          className={`p-4 rounded-lg text-lg font-semibold ${
            editMessage.toLowerCase().includes('error') || editMessage.toLowerCase().includes('failed')
              ? 'bg-red-100 text-red-800 border-2 border-red-400'
              : 'bg-green-100 text-green-800 border-2 border-green-400'
          }`}
        >
          {editMessage}
        </div>
      )}

      {masterData.length > 0 && (
        <div className="space-y-4">
          <Button onClick={addNewRow} variant="success">
            Add New Record
          </Button>

          {selectedRow ? (
            <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-300">
              <h4 className="font-bold text-xl text-gray-800 mb-6">Edit Record</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {Object.entries(editFormData).map(([field, value]) => (
                  <div key={field}>
                    {field === 'StateId' && (editType === 'city' || editType === 'cities') ? (
                      <FilterSelect
                        label={field}
                        value={String(value ?? '')}
                        onChange={(val) => handleFieldChange(field, val)}
                        options={availableStates.map((state) => ({
                          id: state.Id,
                          label: `${state.VALUE} (ID: ${state.Id})`,
                        }))}
                        optionValue="id"
                        optionLabel="label"
                      />
                    ) : field === 'ProductGroupID' && editType === 'product' ? (
                      <FilterSelect
                        label={field}
                        value={String(value ?? '')}
                        onChange={(val) => handleFieldChange(field, val)}
                        options={availableProductGroups.map((g) => ({
                          id: g.Id ?? g.ID ?? g.id,
                          label: `${g.VALUE || g.Value} (ID: ${g.Id ?? g.ID ?? g.id})`,
                        }))}
                        optionValue="id"
                        optionLabel="label"
                      />
                    ) : field === 'ProductID' && (editType === 'models' || editType === 'model') ? (
                      <FilterSelect
                        label={field}
                        value={String(value ?? '')}
                        onChange={(val) => handleFieldChange(field, val)}
                        options={availableProducts.map((p) => ({
                          id: p.ID ?? p.ProductID ?? p.id,
                          label: `${p.VALUE ?? p.ProductName ?? p.Value ?? p.Product} (ID: ${p.ID ?? p.ProductID ?? p.id})`,
                        }))}
                        optionValue="id"
                        optionLabel="label"
                      />
                    ) : field === 'ModelID' && (editType === 'spareparts' || editType === 'sparepart') ? (
                      <FilterSelect
                        label={field}
                        value={String(value ?? '')}
                        onChange={(val) => handleFieldChange(field, val)}
                        options={availableProductModels.map((m) => ({
                          id: m.Id ?? m.ID ?? m.id,
                          label: `${m.MODEL_CODE ?? m.MODEL ?? m.Value} (ID: ${m.Id ?? m.ID ?? m.id})`,
                        }))}
                        optionValue="id"
                        optionLabel="label"
                      />
                    ) : (
                      <FormInput
                        label={field}
                        type="text"
                        disabled={field === 'Id'}
                        value={String(value ?? '')}
                        onChange={(e) => handleFieldChange(field, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button onClick={saveEditedRow} variant="primary" loading={editLoading}>
                  Save Changes
                </Button>
                <Button onClick={() => deleteRow(selectedRow)} variant="danger" loading={editLoading}>
                  Delete Record
                </Button>
                <Button
                  onClick={() => {
                    setSelectedRow(null);
                    setEditFormData({});
                    setIsCreatingNewRecord(false);
                  }}
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto border-2 border-gray-300 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-200 sticky top-0">
                  <tr>
                    {Object.keys(masterData[0]).map((k) => (
                      <th key={k} className="px-4 py-3 border text-left font-bold">
                        {k}
                      </th>
                    ))}
                    <th className="px-4 py-3 border text-center font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {masterData.map((row, i) => (
                    <tr
                      key={i}
                      className={i % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}
                    >
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-4 py-3 border text-gray-700">
                          {String(val ?? '').substring(0, 30)}
                        </td>
                      ))}
                      <td className="px-4 py-3 border text-center">
                        <Button onClick={() => handleEditRowClick(row)} variant="primary" size="sm">
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
)}

      </div>
    </div>
  );
}





   

       
