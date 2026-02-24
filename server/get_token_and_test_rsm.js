// get_token_and_test_rsm.js
// Usage: node get_token_and_test_rsm.js
// Prompts for username and password, fetches JWT, then tests RSM inventory

import fetch from 'node-fetch';
import readline from 'readline';

const API_BASE = 'http://localhost:5000';

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function getToken(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  if (!data.token) throw new Error('No token in response');
  return data.token;
}

async function getAssignedPlants(token) {
  const res = await fetch(`${API_BASE}/api/branch/assigned-plants`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  if (!data.ok || !data.plants || !data.plants.length) throw new Error('No plants assigned');
  return data.plants;
}

async function testRsmInventory(token, branchId) {
  const url = `${API_BASE}/api/branch/current-inventory?branchId=${branchId}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
    timeout: 30000
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
}

(async () => {
  try {
    const username = await prompt('Enter username: ');
    const password = await prompt('Enter password: ');
    const token = await getToken(username, password);
    console.log('Token:', token.substring(0, 32) + '...');
    const plants = await getAssignedPlants(token);
    console.log('Assigned plants:', plants.map(p => `${p.plant_id}:${p.plant_name}`));
    // Pick first plant and first service center for test
    const plant = plants[0];
    const branchId = plant.service_centers && plant.service_centers[0] ? plant.service_centers[0].service_center_id : null;
    if (!branchId) throw new Error('No service center found for assigned plant');
    console.log('Testing inventory for branchId:', branchId);
    await testRsmInventory(token, branchId);
  } catch (err) {
    console.error('ERROR:', err.message);
  }
})();
