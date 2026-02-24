const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJTQ1VzZXIiLCJjZW50ZXJJZCI6NCwicm9sZSI6InNlcnZpY2VfY2VudGVyIiwiaWF0IjoxNzcxMjM1NjU2fQ.oxbba2nqMYdAjWQmJK95SFbKzOf8a6l9AkEdFGFAx5s';

async function testAPI() {
  try {
    console.log('🔍 Testing GET /api/technician-spare-requests\n');
    
    const response = await fetch('http://localhost:5000/api/technician-spare-requests', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Status:', response.status);
    const data = await response.json();
    console.log('✅ Response:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
