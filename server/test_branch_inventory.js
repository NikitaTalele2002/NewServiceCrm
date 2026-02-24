// test_branch_inventory.js
// Usage: node test_branch_inventory.js

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api/branch/current-inventory';
// Insert your valid JWT token below
const TOKEN = process.env.TEST_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OSwidXNlcm5hbWUiOiJGQ0xfQ09DSElOIiwicm9sZSI6ImJyYW5jaCIsImNlbnRlcklkIjpudWxsLCJicmFuY2hJZCI6MSwiaWF0IjoxNzcwOTA4MTA0LCJleHAiOjE3NzA5MzY5MDR9.Gb4lZSLdHemK1_uvKeeNLQHm69JcOuXRw_SqgCHKTYo';

async function testBranchInventory() {
  try {
    const res = await fetch(API_URL, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      if (Array.isArray(data.inventory)) {
        console.log('✅ Inventory fetch successful: Items:', data.inventory.length);
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

testBranchInventory();
