/**
 * Test updated API endpoint
 */
import fetch from 'node-fetch';

async function test() {
  try {
    console.log('🧪 Testing GET /api/spare-requests?status=Allocated\n');
    
    // Test the endpoint
    const response = await fetch('http://localhost:5000/api/spare-requests?status=Allocated', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
        // No auth token for now - testing endpoints
      }
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.log('❌ Error response:', error);
    } else {
      const data = await response.json();
      console.log('✅ Response data:');
      console.log(JSON.stringify(data, null, 2));
      console.log(`\n✅ Total requests: ${data.length}`);
      if (data.length > 0) {
        console.log('\nFirst request:');
        console.log(JSON.stringify(data[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
