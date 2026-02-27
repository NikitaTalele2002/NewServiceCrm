/**
 * Service for uploading master data files
 */

import { getApiUrl } from '../config/apiConfig';

const API_BASE = getApiUrl('');

export const uploadMasterDataFile = async (type, file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload/${type}`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'Upload failed');
  }
};

export const uploadProductGroups = (file) => uploadMasterDataFile('product-groups', file);
export const uploadStates = (file) => uploadMasterDataFile('states', file);
export const uploadCities = (file) => uploadMasterDataFile('cities', file);
export const uploadPincodes = (file) => uploadMasterDataFile('pincodes', file);
export const uploadSpareParts = (file) => uploadMasterDataFile('spare-parts', file);
