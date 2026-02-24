const API_BASE = 'http://localhost:5000';

// Test token for authentication
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6IkFkbWluIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcwMDAwMDAwMH0.mock-token';

async function testSyncSap() {
  try {
    console.log('🚀 Testing sync-sap endpoint...\n');

    // Test with request ID 26 (which we confirmed exists and is approved)
    const response = await fetch(`${API_BASE}/api/logistics/sync-sap`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requestId: 26 })
    });
    
    const data = await response.json();

    console.log('✅ Success!');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error in sync-sap endpoint:');
    console.error('Error Message:', error.message);
  }
}

testSyncSap();
