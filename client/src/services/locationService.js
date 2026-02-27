import { getApiUrl } from '../config/apiConfig';

export const getStatesApi = async () => {
  const response = await fetch(getApiUrl('/location/states'));
  if (!response.ok) throw new Error('Failed to fetch states');
  return await response.json();
};

export const getCitiesApi = async (stateId) => {
  const response = await fetch(getApiUrl(`/location/cities?state=${encodeURIComponent(stateId)}`));
  if (!response.ok) throw new Error('Failed to fetch cities');
  return await response.json();
};

export const getPincodesApi = async (cityId) => {
  const response = await fetch(getApiUrl(`/location/pincodes?city=${encodeURIComponent(cityId)}`));
  if (!response.ok) throw new Error('Failed to fetch pincodes');
  return await response.json();
};

export const uploadLocationExcelApi = async (file, mode = 'replace') => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(getApiUrl(`/location/uploadExcel?mode=${mode}`), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Failed to upload Excel file');
  return await response.json();
};