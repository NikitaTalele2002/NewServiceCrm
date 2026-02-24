// test_rsm_create.cjs
// Usage: node test_rsm_create.cjs
// Hardcoded token and plant_id for direct test

const fetch = require('node-fetch');
const API_URL = 'http://localhost:5000/api/branch/current-inventory';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX...'; // Your working token
const PLANT_ID = '1'; // The plant_id you want to test

async function testRsmInventory() {
  if (!TOKEN || !PLANT_ID) {
    console.error('Set TOKEN and PLANT_ID in the script');
    return;
  }
  try {
    const url = `${API_URL}?plant_id=${PLANT_ID}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20 seconds
    let res, data;
    try {
      res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${TOKEN}` },
        signal: controller.signal
      });
      clearTimeout(timeout);
      data = await res.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('❌ Error: Request timed out. Backend may be slow or unreachable.');
        return;
      }
      throw err;
    }
    if (res.ok && data.ok) {
      if (Array.isArray(data.inventory)) {
        console.log('✅ RSM Inventory fetch successful: Items:', data.inventory.length);
        if (data.inventory.length > 0) {
          console.log('Spare parts list:');
          data.inventory.forEach((item, idx) => {
            console.log(`${idx + 1}.`, item);
          });
        } else {
          console.warn('No spare parts found in inventory.');
        }
      } else {
        console.warn('Inventory is not an array:', data.inventory);
      }
    } else {
      console.error('❌ Inventory fetch failed:', data);
    }
  } catch (err) {
    console.error('❌ Error during fetch:', err);
  }
}

testRsmInventory();
