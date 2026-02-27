import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/apiConfig';

const SparePartsDisplay = ({ callId }) => {
  const [spareParts, setSpareParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (callId) {
      fetchSpareParts();
    }
  }, [callId]);

  const fetchSpareParts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl(`/call-center/spare-usage/${callId}`), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSpareParts(data.data || data.spareParts || []);
    } catch (err) {
      console.error('[SparePartsDisplay] Error fetching spare parts:', err);
      setError('Failed to load spare parts');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      USED: 'bg-green-100 text-green-800',
      PARTIAL: 'bg-yellow-100 text-yellow-800',
      NOT_USED: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.PARTIAL;
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded border border-gray-300">
        <p className="text-gray-600">Loading spare parts...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded border border-gray-300">
      <h3 className="text-lg font-semibold mb-4">Spare Parts Used</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {spareParts.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-gray-500 mb-3">📦 No spare parts used for this call</p>
          <p className="text-sm text-gray-400">
            Once spare parts are allocated and used, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {spareParts.map((part, index) => (
            <div
              key={part.usage_id || index}
              className="flex items-start justify-between border border-gray-200 rounded-lg p-4 hover:shadow-md transition bg-gray-50"
            >
              {/* Left: Part details */}
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {part.SparePart?.spare_part_name || part.spare_part_name || 'Unknown Part'}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(part.usage_status)}`}>
                    {part.usage_status || 'PARTIAL'}
                  </span>
                  <span className="text-xs text-gray-600">
                    Part ID: {part.spare_part_id}
                  </span>
                </div>
              </div>

              {/* Right: Quantities */}
              <div className="ml-4 text-right">
                <div className="text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium">Issued:</span> {part.issued_qty || 0}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Used:</span> {part.used_qty || 0}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Returned:</span> {part.returned_qty || 0}
                  </p>
                </div>
              </div>

              {/* Extra details */}
              <div className="ml-4 text-right text-xs text-gray-600">
                {part.used_at && (
                  <p>Used: {new Date(part.used_at).toLocaleDateString()}</p>
                )}
                {part.remarks && (
                  <p className="mt-1 text-gray-700 max-w-xs truncate" title={part.remarks}>
                    {part.remarks}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SparePartsDisplay;
