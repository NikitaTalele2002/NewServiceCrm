/**
 * Formatters Utility
 * Eliminates duplicate option formatting logic across 3+ files
 * Provides consistent field name resolution for inconsistent API responses
 */

/**
 * Format API response array into option objects
 * Handles multiple field name variations (ID/Id/id, DESCRIPTION/Description, etc.)
 * 
 * @param {Array} items - Array of items from API
 * @param {Object} config - Configuration for field mapping
 * @returns {Array} Array of { id, label } objects
 */
export const formatOptions = (items, config = {}) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const {
    idFields = ['ID', 'Id', 'id', 'VALUE', 'Value', 'value', 'Sku', 'sku', 'SKU'],
    labelFields = ['DESCRIPTION', 'Description', 'description', 'NAME', 'Name', 'name', 'VALUE', 'Value', 'value', 'ProductName', 'MODEL', 'Model', 'GroupName'],
    idFieldOverride = null,
    labelFieldOverride = null,
  } = config;

  return items
    .filter((item) => item !== null && item !== undefined)
    .map((item) => {
      // Use override if provided
      let id = idFieldOverride ? item[idFieldOverride] : null;
      let label = labelFieldOverride ? item[labelFieldOverride] : null;

      // Find id from fallback chain
      if (!id) {
        for (const field of idFields) {
          if (item[field] !== null && item[field] !== undefined && item[field] !== '') {
            id = item[field];
            break;
          }
        }
      }

      // Find label from fallback chain
      if (!label) {
        for (const field of labelFields) {
          if (item[field] !== null && item[field] !== undefined && item[field] !== '') {
            label = item[field];
            break;
          }
        }
      }

      // Fallback to string representation if nothing found
      if (!id) id = String(item);
      if (!label) label = String(item);

      return {
        id: String(id),
        label: String(label),
      };
    });
};

/**
 * Group items by a specific field
 * Useful for organizing options hierarchically
 * 
 * @param {Array} items - Array of items to group
 * @param {String} groupField - Field name to group by
 * @returns {Object} Object with group names as keys and items array as values
 */
export const groupBy = (items, groupField) => {
  if (!Array.isArray(items)) return {};

  return items.reduce((acc, item) => {
    const key = item[groupField] || 'Other';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
};

/**
 * Format date field
 * Handles multiple date formats and invalid dates
 * 
 * @param {String|Date} date - Date to format
 * @param {String} format - Format string (e.g., 'YYYY-MM-DD', 'DD/MM/YYYY')
 * @returns {String} Formatted date or empty string if invalid
 */
export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '';

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
    if (format === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
    if (format === 'MM/DD/YYYY') return `${month}/${day}/${year}`;

    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
};

/**
 * Parse date from various formats
 * 
 * @param {String} dateStr - Date string
 * @returns {String} Date in YYYY-MM-DD format or empty string
 */
export const parseDate = (dateStr) => {
  if (!dateStr) return '';

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
};

/**
 * Get field value with fallback chain
 * Used for finding values from API responses with inconsistent field names
 * 
 * @param {Object} obj - Object to extract from
 * @param {Array} fieldNames - Array of field names to try in order
 * @param {*} defaultValue - Default value if none found
 * @returns {*} Value from object or default
 */
export const getFieldValue = (obj, fieldNames, defaultValue = null) => {
  if (!obj) return defaultValue;

  for (const field of fieldNames) {
    if (obj[field] !== null && obj[field] !== undefined && obj[field] !== '') {
      return obj[field];
    }
  }

  return defaultValue;
};

/**
 * Normalize API response
 * Converts various API response formats to consistent structure
 * 
 * @param {*} response - API response
 * @returns {Array} Normalized array of items
 */
export const normalizeResponse = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (response && typeof response === 'object') {
    if (Array.isArray(response.rows)) return response.rows;
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.results)) return response.results;
    if (Array.isArray(response.items)) return response.items;
  }

  return [];
};

export default {
  formatOptions,
  groupBy,
  formatDate,
  parseDate,
  getFieldValue,
  normalizeResponse,
};
