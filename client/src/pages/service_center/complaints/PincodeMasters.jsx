import React from 'react';
import { usePincodeMasters } from '../../../hooks/usePincodeMasters';
import UploadExcel from './components/UploadExcel';
import PincodeMastersTable from './components/PincodeMastersTable';

export default function PincodeMasters() {
  const {
    states,
    cities,
    pincodes,
    selectedState,
    selectedCity,
    selectedPincode,
    loading,
    error,
    handleStateChange,
    handleCityChange,
    handlePincodeChange,
    handleSubmit,
    handleUpload
  } = usePincodeMasters();

  return (
    <div className="p-6 container">
      <h1 className="text-2xl font-semibold mb-4">Pincode Masters</h1>

      {/* Upload Excel */}
      <UploadExcel onUploaded={() => handleUpload(null, 'replace')} />

      {loading && <div className="text-center py-4">Loading...</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <PincodeMastersTable
        states={states}
        cities={cities}
        pincodes={pincodes}
        selectedState={selectedState}    selectedCity={selectedCity}
        selectedPincode={selectedPincode}
        onStateChange={handleStateChange}
        onCityChange={handleCityChange}
        onPincodeChange={handlePincodeChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
