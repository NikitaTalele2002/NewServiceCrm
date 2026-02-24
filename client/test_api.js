// Test API response to verify complete data is returned
fetch('/api/complaints', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('Total complaints:', data.complaints.length);
  if (data.complaints.length > 0) {
    console.log('\n=== SAMPLE COMPLAINT DATA ===');
    const sample = data.complaints[0];
    console.log(JSON.stringify(sample, null, 2));
    console.log('\n=== AVAILABLE FIELDS ===');
    console.log(Object.keys(sample).join(', '));
  }
})
.catch(e => console.error('Error:', e.message));
