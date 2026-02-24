/**
 * Test RSM Pending Returns Endpoint
 */

import fetch from 'node-fetch';

async function testPendingReturns() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUsInVzZXJuYW1lIjoiUlNNLVNoYXJtYS0xIiwicm9sZSI6InJzbSIsImNlbnRlcklkIjpudWxsLCJyc21JZCI6MiwiaWF0IjoxNzcxNzk5NzkzLCJleHAiOjE3NzE4Mjg1OTN9.7hy3lXCbZYKqocIv64GZGSY7vSvBxbB8JBfdaWiky6E';

  try {
    console.log('Testing /api/spare-returns/pending-approval?plant_id=1\n');
    
    const res = await fetch('http://localhost:5000/api/spare-returns/pending-approval?plant_id=1', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Status:', res.status);
    const text = await res.text();
    console.log('\nRaw Response:');
    console.log(text);
    
    try {
      const data = JSON.parse(text);
      console.log('\nParsed JSON:');
      console.log(JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Could not parse as JSON');
    }

  } catch (error) {
    console.error('❌ Fetch Error:', error.message);
  }
}

testPendingReturns();
