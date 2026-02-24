// create.js
// Script to test assigned plants and inventory API for RSM and branch users
// Usage: node create.js <token> [plant_id]

import fetch from 'node-fetch';

async function testAssignedPlants(token) {
  const res = await fetch('http://localhost:5000/api/branch/assigned-plants', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('Assigned Plants Response:', JSON.stringify(data, null, 2));
  return data;
}

async function testInventory(token, plant_id) {
  const res = await fetch('http://localhost:5000/api/branch/current-inventory', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ plant_id })
  });
  const data = await res.json();
  console.log('Current Inventory Response:', JSON.stringify(data, null, 2));
  return data;
}

async function main() {
  const [,, token, plant_id] = process.argv;
  if (!token) {
    console.error('Usage: node create.js <token> [plant_id]');
    process.exit(1);
  }
  console.log('Testing assigned plants...');
  const assigned = await testAssignedPlants(token);
  if (plant_id) {
    console.log(`Testing inventory for plant_id=${plant_id}...`);
    await testInventory(token, plant_id);
  } else if (assigned && assigned.plants && assigned.plants.length > 0) {
    const firstPlantId = assigned.plants[0].plant_id;
    console.log(`Testing inventory for first assigned plant_id=${firstPlantId}...`);
    await testInventory(token, firstPlantId);
  } else {
    console.log('No plant_id provided and no assigned plants found.');
  }
}

main();
