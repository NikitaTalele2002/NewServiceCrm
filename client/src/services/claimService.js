export const searchClaimsApi = async (params) => {
  const token = localStorage.getItem('token');
  const query = new URLSearchParams(params);
  const response = await fetch(`/api/monthly-claims/search?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to search claims');
  return await response.json();
};

export const updateClaimApi = async (claimData) => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/monthly-claims/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(claimData)
  });
  if (!response.ok) throw new Error('Failed to update claim');
  return await response.json();
};

export const submitClaimApi = async (claimData) => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/monthly-claims/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(claimData)
  });
  if (!response.ok) throw new Error('Failed to submit claim');
  return await response.json();
};