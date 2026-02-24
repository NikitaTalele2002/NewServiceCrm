// test_rsm_inventory.js
// Usage: TEST_RSM_TOKEN=<token> TEST_BRANCH_ID=<asc_id> node test_rsm_inventory.js

const fetch = require('node-fetch');

const API_URL = 'http://localhost:5000/api/branch/current-inventory';
const TOKEN = process.env.TEST_RSM_TOKEN || '';
const BRANCH_ID = process.env.TEST_BRANCH_ID || '';

async function testRsmInventory() {
  if (!TOKEN || !BRANCH_ID) {
    console.error('Set TEST_RSM_TOKEN and TEST_BRANCH_ID env variables');
    return;
  }
  try {
    const url = `${API_URL}?branchId=${BRANCH_ID}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const data = await res.json();
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
