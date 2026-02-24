import React from 'react';

const DCFTable = ({ data, onDcfClick }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="p-2 overflow-x-auto">
      <table className="w-full border-collapse min-w-max">
        <thead>
          <tr className="bg-gray-100">
            <th className="border-2 border-black p-2 text-sm font-semibold text-center">DCF No.</th>
            <th className="border-2 border-black p-2 text-sm font-semibold text-center">Total DCF QTY</th>
            <th className="border-2 border-black p-2 text-sm font-semibold text-center">RSM Approved QTY</th>
            <th className="border-2 border-black p-2 text-sm font-semibold text-center">DCF Submit Date</th>
            <th className="border-2 border-black p-2 text-sm font-semibold text-center">C&F Receipt Date</th>
            <th className="border-2 border-black p-2 text-sm font-semibold text-center">RSM Approval/Rejection Date</th>
            <th className="border-2 border-black p-2 text-sm font-semibold text-center">CN Date</th>
            <th className="border-2 border-black p-2 text-sm font-semibold text-center">CN Value</th>
            <th className="border-2 border-black p-2 text-sm font-semibold text-center">CN Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td
                className="border-2 border-black p-2 text-sm text-center text-blue-600 cursor-pointer hover:underline"
                onClick={() => onDcfClick(item.id)}
              >
                {item.dcfNo}
              </td>
              <td className="border-2 border-black p-2 text-sm text-center">{item.totalDcfQty}</td>
              <td className="border-2 border-black p-2 text-sm text-center">{item.rsmApprovedQty !== undefined ? item.rsmApprovedQty : item.cfApprovedQty}</td>
              <td className="border-2 border-black p-2 text-sm text-center">{formatDate(item.dcfSubmitDate)}</td>
              <td className="border-2 border-black p-2 text-sm text-center">{formatDate(item.cfReceiptDate)}</td>
              <td className={`border-2 border-black p-2 text-sm text-center font-semibold ${item.cfApprovalDate ? 'bg-green-100' : 'bg-white'}`}>
                {formatDate(item.cfApprovalDate)}
              </td>
              <td className="border-2 border-black p-2 text-sm text-center">{formatDate(item.cnDate)}</td>
              <td className="border-2 border-black p-2 text-sm text-center">{item.cnValue}</td>
              <td className="border-2 border-black p-2 text-sm text-center font-bold">{item.cnCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DCFTable;
