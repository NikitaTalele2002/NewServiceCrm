import React from 'react';

const ProductReplacementForm = ({
  formData,
  options,
  loading,
  complaintLoading,
  isDataFetched,
  onInputChange,
  onSubmit,
  onCallIdBlur
}) => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Set Product Replacement</h1>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Call Id */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ minWidth: '120px', fontWeight: 'bold' }}>Call Id:</label>
          <input
            type="text"
            name="callId"
            value={formData.callId}
            onChange={onInputChange}
            onBlur={() => onCallIdBlur(formData.callId)}
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            required
          />
          {complaintLoading && <span>Loading complaint details...</span>}
        </div>

        {/* Product Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ minWidth: '120px', fontWeight: 'bold' }}>Product Group:</label>
          <select
            name="productGroup"
            value={formData.productGroup}
            onChange={onInputChange}
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            required
            disabled={isDataFetched}>
            <option value="">Select Product Group</option>
            {options.productGroups && options.productGroups.map(group => (
              <option key={group.Id} value={group.Id}>{group.DESCRIPTION}</option>
            ))}
          </select>
        </div>

        {/* Product */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ minWidth: '120px', fontWeight: 'bold' }}>Product:</label>
          <select
            name="product"
            value={formData.product}
            onChange={onInputChange}
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            required
            disabled={!formData.productGroup || isDataFetched}>
            <option value="">Select Product</option>
            {options.products && options.products.map(product => (
              <option key={product.ID} value={product.DESCRIPTION}>{product.DESCRIPTION}</option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ minWidth: '120px', fontWeight: 'bold' }}>Model:</label>
          <select
            name="model"
            value={formData.model}
            onChange={onInputChange}
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            required
            disabled={!formData.product || isDataFetched}>
            <option value="">Select Model</option>
            {options.models && options.models.map(model => (
              <option key={model.Id} value={model.MODEL_DESCRIPTION}>{model.MODEL_DESCRIPTION}</option>
            ))}
          </select>
        </div>

        {/* Serial No */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ minWidth: '120px', fontWeight: 'bold' }}>Serial No:</label>
          <input
            type="text"
            name="serialNo"
            value={formData.serialNo}
            onChange={onInputChange}
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            required
            disabled={isDataFetched}
          />
        </div>

        {/* RSM */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ minWidth: '120px', fontWeight: 'bold' }}>RSM:</label>
          <select
            name="rsm"
            value={formData.rsm}
            onChange={onInputChange}
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            required
          >
            <option value="">Select RSM</option>
            <option value="Rsm1">Rsm1</option>
            <option value="Rsm2">Rsm2</option>
            <option value="Rsm3">Rsm3</option>
          </select>
        </div>

        {/* HOD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ minWidth: '120px', fontWeight: 'bold' }}>HOD:</label>
          <select
            name="hod"
            value={formData.hod}
            onChange={onInputChange}
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            required
          >
            <option value="">Select HOD</option>
            <option value="HOD">HOD</option>
          </select>
        </div>

        {/* Technician */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ minWidth: '120px', fontWeight: 'bold' }}>Technician:</label>
          <select
            name="technician"
            value={formData.technician}
            onChange={onInputChange}
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f8f9fa' }}
            disabled
          >
            <option value="">Select Technician</option>
            {options.technicians && options.technicians.map(tech => (
              <option key={tech.Id} value={tech.Id}>{tech.Name}</option>
            ))}
          </select>
        </div>

        {/* ASC */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ minWidth: '120px', fontWeight: 'bold' }}>ASC:</label>
          <select
            name="asc"
            value={formData.asc}
            onChange={onInputChange}
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f8f9fa' }}
            disabled
          >
            <option value="">Select Service Center</option>
            {options.serviceCenters && options.serviceCenters.map(center => (
              <option key={center.Id} value={center.Id}>{center.CenterName}</option>
            ))}
          </select>
        </div>

        {/* Requested By */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ minWidth: '120px', fontWeight: 'bold' }}>Requested By:</label>
          <input
            type="text"
            name="requestedBy"
            value={formData.requestedBy}
            onChange={onInputChange}
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            required
          />
        </div>

        {/* Spare order Request No */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ minWidth: '120px', fontWeight: 'bold' }}>Spare order Request No.:</label>
          <input
            type="text"
            name="spareOrderRequestNo"
            value={formData.spareOrderRequestNo}
            onChange={onInputChange}
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        {/* Replacement Reason */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ minWidth: '120px', fontWeight: 'bold' }}>Replacement Reason:</label>
          <textarea
            name="replacementReason"
            value={formData.replacementReason}
            onChange={onInputChange}
            style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' }}
            required
          />
        </div>

        {/* Submit Button */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>

      {/* Note */}
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
        <p style={{ margin: 0, color: '#dc3545', fontWeight: 'bold' }}>
          Note*: In case of order spare part order type is Auto CRM
        </p>
      </div>
    </div>
  );
};

export default ProductReplacementForm;