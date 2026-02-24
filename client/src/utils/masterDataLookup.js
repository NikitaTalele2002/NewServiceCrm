/**
 * Master Data Lookup Utilities
 * Maps IDs to descriptions for city, state, and product group fields
 */

export const masterDataLookup = {
  /**
   * Find state description by ID or value
   * @param {number|string} stateId - The state ID or value
   * @param {Array} states - Array of state objects
   * @returns {string} Description or empty string
   */
  findStateName(stateId, states = []) {
    if (!stateId || !states.length) return '';
    
    const s = String(stateId).trim();
    if (!s) return '';
    
    // Try exact ID match
    const byId = states.find(st => {
      const ids = [st.Id, st.id, st.VALUE, st.Value];
      return ids.some(x => x && String(x).trim() === s);
    });
    
    if (byId) {
      return byId.DESCRIPTION || byId.Description || byId.VALUE || byId.Value || '';
    }
    
    // Try numeric match
    if (!isNaN(Number(s))) {
      const byNum = states.find(st => st.Id === Number(s) || st.id === Number(s));
      if (byNum) {
        return byNum.DESCRIPTION || byNum.Description || byNum.VALUE || byNum.Value || '';
      }
    }
    
    return '';
  },

  /**
   * Find city description by ID or value
   * @param {number|string} cityId - The city ID or value
   * @param {Array} cities - Array of city objects
   * @returns {string} Description or empty string
   */
  findCityName(cityId, cities = []) {
    if (!cityId || !cities.length) return '';
    
    const s = String(cityId).trim();
    if (!s) return '';
    // Try exact ID match
    const byId = cities.find(c => {
      const ids = [c.Id, c.id, c.Value, c.value, c.VALUE];
      return ids.some(x => x && String(x).trim() === s);
    });
    
    if (byId) {
      return byId.Description || byId.description || byId.Value || byId.value || byId.VALUE || '';
    }
    
    // Try numeric match
    if (!isNaN(Number(s))) {
      const byNum = cities.find(c => c.Id === Number(s) || c.id === Number(s));
      if (byNum) {
        return byNum.Description || byNum.description || byNum.Value || byNum.value || byNum.VALUE || '';
      }
    }
    
    return '';
  },

  /**
   * Find product group description by ID or value
   * @param {number|string} groupId - The product group ID or value
   * @param {Array} groups - Array of product group objects
   * @returns {string} Description or empty string
   */
  findProductGroupName(groupId, groups = []) {
    if (groupId === null || groupId === undefined || !groups.length) return '';
    
    let s = String(groupId).trim();
    if (!s) return '';
    
    // Handle decimal numbers (e.g., "1.0" -> "1")
    if (/^\d+\.0+$/.test(s)) {
      s = s.replace(/\.0+$/, '');
    }
    
    // Try exact ID match
    const byId = groups.find(g => {
      const ids = [g.Id, g.id, g.VALUE, g.Value, g.value, g.ProductGroupID, g.ProductGroup];
      return ids.some(x => {
        if (x === null || x === undefined) return false;
        const xs = String(x).trim();
        if (!xs) return false;
        if (xs === s) return true;
        if (!isNaN(Number(xs)) && !isNaN(Number(s)) && Number(xs) === Number(s)) return true;
        return false;
      });
    });
    
    if (byId) {
      return byId.DESCRIPTION || byId.Description || byId.Name || byId.ProductGroup || '';
    }
    
    // Try description match (case-insensitive)
    const lower = s.toLowerCase();
    const byDesc = groups.find(g => {
      const cand = (g.Name || g.ProductGroup || g.Description || g.DESCRIPTION || g.Value || g.VALUE || '') + '';
      return cand.toLowerCase().trim() === lower;
    });
    
    if (byDesc) {
      return byDesc.DESCRIPTION || byDesc.Description || byDesc.Name || byDesc.ProductGroup || '';
    }
    return s;
  },
};
