import React, { useState, useEffect } from 'react';
import InvoiceModal from './InvoiceModal';
import { useRole } from '../../../context/RoleContext';
import { useClaims } from '../../../hooks/useClaims';
import ClaimForm from '../../../components/claims/ClaimForm';

export default function SubmitClaim() {
  const { user } = useRole();
  const { loading, error, searchClaims, updateClaim, submitClaim } = useClaims();

  const [formData, setFormData] = useState({
    year: '',
    month: '',
    invoiceNumber: '',
    complaints: '',
    centerId: user?.serviceCenterId || ''
  });

  // Update centerId when user changes
  useEffect(() => {
    if (user?.serviceCenterId) {
      setFormData(prev => ({
        ...prev,
        centerId: user.serviceCenterId
      }));
    }
  }, [user?.serviceCenterId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = async () => {
    const result = await searchClaims(formData);
    if (result.success) {
      console.log('Search successful:', result.data);
      // Handle successful search (e.g., show results)
    } else {
      console.error('Search failed:', result.error);
      // Handle error (e.g., show error message)
    }
  };

  const handleReset = () => {
    setFormData({
      year: '',
      month: '',
      invoiceNumber: '',
      complaints: '',
      centerId: user?.serviceCenterId,
    });
  };

  const handleUpdate = async () => {
    const result = await updateClaim(formData);
    if (result.success) {
      console.log('Update successful:', result.data);
      // Handle successful update
    } else {
      console.error('Update failed:', result.error);
      // Handle error
    }
  };

  const [showInvoice, setShowInvoice] = useState(false);
  const openInvoice = () => setShowInvoice(true);
  const closeInvoice = () => setShowInvoice(false);

  return (
    <>
      <ClaimForm
        formData={formData}
        onChange={handleInputChange}
        onSearch={handleSearch}
        onReset={handleReset}
        onUpdate={handleUpdate}
        onPreviewInvoice={openInvoice}
        loading={loading}
      />

      {/* Invoice Modal (fetched from API) */}
      <InvoiceModal
        open={showInvoice}
        onClose={closeInvoice}
        params={{
          year: formData.year,
          month: formData.month,
          invoiceNumber: formData.invoiceNumber,
          invoiceDate: new Date().toISOString().split('T')[0],
          centerId: formData.centerId,
          complaints: formData.complaints,
        }}
      />
    </>
  );
}
