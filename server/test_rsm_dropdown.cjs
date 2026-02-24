// Test script to verify RSM assigned plants and dropdown logic
const fetch = require('node-fetch');
const token = process.argv[2];

if (!token) {
  console.error('Usage: node test_rsm_dropdown.cjs <JWT_TOKEN>');
  process.exit(1);
}

async function testAssignedPlants() {
  const res = await fetch('http://localhost:5000/api/branch/assigned-plants', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('Assigned Plants API Response:', JSON.stringify(data, null, 2));
  if (data.ok && Array.isArray(data.plants) && data.plants.length > 0) {
    console.log('PASS: RSM has assigned plants. Dropdown should appear.');
  } else if (data.ok && Array.isArray(data.plants) && data.plants.length === 0) {
    console.log('FAIL: RSM has no assigned plants. Dropdown will be empty.');
  } else {
    console.log('FAIL: API error or invalid response.');
  }
}

testAssignedPlants();