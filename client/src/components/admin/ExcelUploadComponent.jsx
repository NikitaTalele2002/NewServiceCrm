import React, { useState } from 'react';
import {
  uploadProductGroups,
  uploadStates,
  uploadCities,
  uploadPincodes,
  uploadSpareParts
} from '../../services/masterUploadService';

export default function ExcelUploadComponent() {
  const [selectedType, setSelectedType] = useState('product-groups');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const uploadTypes = [
    { value: 'product-groups', label: 'Product Groups', description: 'Columns: ID, VALUE, DESCRIPTION' },
    { value: 'states', label: 'States', description: 'Columns: STATE_NAME, STATE_CODE' },
    { value: 'cities', label: 'Cities', description: 'Columns: CITY_NAME, STATE_ID' },
    { value: 'pincodes', label: 'Pincodes', description: 'Columns: PINCODE, CITY_ID' },
    { value: 'spare-parts', label: 'Spare Parts', description: 'Columns: SPARE_NAME, SPARE_CODE, DESCRIPTION, PRODUCT_GROUP_ID' }
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        setErrorMessage('Only Excel files (.xlsx, .xls) are supported');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setErrorMessage('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file');
      return;
    }

    setUploading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setUploadResult(null);

    try {
      let response;

      switch (selectedType) {
        case 'product-groups':
          response = await uploadProductGroups(selectedFile);
          break;
        case 'states':
          response = await uploadStates(selectedFile);
          break;
        case 'cities':
          response = await uploadCities(selectedFile);
          break;
        case 'pincodes':
          response = await uploadPincodes(selectedFile);
          break;
        case 'spare-parts':
          response = await uploadSpareParts(selectedFile);
          break;
        default:
          throw new Error('Unknown upload type');
      }

      setUploadResult(response.results);
      setSuccessMessage(response.message);
      setSelectedFile(null);
      document.getElementById('fileInput').value = '';

    } catch (error) {
      setErrorMessage(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">📊 Upload Master Data</h2>
          <p className="text-gray-600">Upload Excel files to populate master data in the database</p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          {/* Type Selection */}
          <div className="mb-6">
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              🔹 Select Data Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uploadTypes.map((type) => (
                <div
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                    selectedType === type.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{type.label}</div>
                  <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* File Selection */}
          <div className="mb-6">
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              📁 Select Excel File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
              <input
                id="fileInput"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="fileInput" className="cursor-pointer">
                <div className="text-4xl mb-2">📄</div>
                <div className="text-lg font-semibold text-gray-900 mb-1">
                  {selectedFile ? selectedFile.name : 'Click to select or drag and drop'}
                </div>
                <div className="text-sm text-gray-600">
                  Supports .xlsx and .xls files (Max 10MB)
                </div>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex gap-3">
                <span className="text-2xl">❌</span>
                <div>
                  <div className="font-semibold text-red-900">{errorMessage}</div>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <div className="font-semibold text-green-900">{successMessage}</div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className={`w-full py-3 rounded-lg font-semibold transition ${
              uploading
                ? 'bg-gray-400 text-black cursor-not-allowed'
                : selectedFile
                ? 'bg-blue-600 text-black hover:bg-blue-700'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
          >
            {uploading ? '⏳ Uploading...' : '🚀 Upload File'}
          </button>
        </div>

        {/* Results */}
        {uploadResult && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">📈 Upload Results</h3>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                <div className="text-sm font-semibold text-gray-600">Successful</div>
                <div className="text-3xl font-bold text-green-600">{uploadResult.success}</div>
              </div>
              <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
                <div className="text-sm font-semibold text-gray-600">Failed</div>
                <div className="text-3xl font-bold text-red-600">{uploadResult.failed}</div>
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                <div className="text-sm font-semibold text-gray-600">Total</div>
                <div className="text-3xl font-bold text-blue-600">
                  {uploadResult.success + uploadResult.failed}
                </div>
              </div>
            </div>

            {/* Created Records */}
            {uploadResult.created && uploadResult.created.length > 0 && (
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  ✅ Successfully Created ({uploadResult.created.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        {Object.keys(uploadResult.created[0]).map((key) => (
                          <th
                            key={key}
                            className="px-4 py-2 text-left text-sm font-semibold text-gray-900 border"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.created.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {Object.values(item).map((value, i) => (
                            <td key={i} className="px-4 py-2 text-sm text-gray-600 border">
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Errors */}
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  ❌ Errors ({uploadResult.errors.length})
                </h4>
                <div className="space-y-3">
                  {uploadResult.errors.map((error, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm"
                    >
                      <div className="font-semibold text-red-900">
                        Row {error.row}: {error.error}
                      </div>
                      <div className="text-red-700 text-xs mt-2">
                        {JSON.stringify(error.data, null, 2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
