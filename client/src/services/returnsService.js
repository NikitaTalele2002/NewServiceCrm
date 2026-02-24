export const getServiceCenterReturnRequestsApi = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/returns/service-center-requests', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch return requests');
  return await response.json();
};

export const getReturnRequestDetailsApi = async (requestId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/returns/service-center-requests/${requestId}/details`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch return request details');
  return await response.json();
};

export const createReturnRequestApi = async (returnData) => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/returns/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(returnData)
  });
  if (!response.ok) throw new Error('Failed to create return request');
  return await response.json();
};
