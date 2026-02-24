import jwt from 'jsonwebtoken';

const token = jwt.sign({ id: 1, centerId: 4, role: 'service_center' }, 'supersecret_jwt_key_change_me');

fetch('http://localhost:5000/api/inventory/current?modelId=1', {
  headers: { Authorization: `Bearer ${token}` }
})
  .then(r => r.json())
  .then(d => {
    console.log('Filtered by modelId=1, returned', d.length, 'rows:');
    console.log(JSON.stringify(d, null, 2));
  })
  .catch(e => console.error('Error:', e.message));
