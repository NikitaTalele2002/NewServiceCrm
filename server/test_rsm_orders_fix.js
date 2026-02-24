import fetch from 'node-fetch';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAsInVzZXJuYW1lIjoiQ09DSElOLVJTTTEiLCJyb2xlIjoicnNtIiwiY2VudGVySWQiOm51bGwsInJzbUlkIjoxMCwiaWF0IjoxNzcxMDQ2ODY5LCJleHAiOjE3NzEwNzU2Njl9.aEcXd8Nbsbyio3ZH02_cgTMow3ZvHuMrgsTjhSEr1oA';

async function testRsmOrders() {
  try {
    console.log('Testing RSM Spare Requests endpoint...');
    const response = await fetch('http://localhost:5000/api/rsm/spare-requests', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Response not ok:', response.status);
      const text = await response.text();
      console.error('Response text:', text);
      return;
    }

    const data = await response.json();
    console.log('✓ Success! Response received:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRsmOrders();
