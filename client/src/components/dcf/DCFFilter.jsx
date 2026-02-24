import React from 'react';
import FormInput from '../common/FormInput';

const DCFFilter = ({ value, onChange }) => {
  return (
    <div className="mb-6 bg-white p-6 rounded-lg shadow">
      <FormInput
        label="DCF Number"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter DCF Number to filter"
        className="w-full"
      />
    </div>
  );
};

export default DCFFilter;