import http from 'http';

const testEndpoint = (techId) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/spare-requests/technicians/${techId}/inventory`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\n✓ Technician ${techId}:`);
        console.log(`Status: ${res.statusCode}`);
        try {
          const inventory = JSON.parse(data);
          console.log(`Found ${inventory.length} inventory items:`);
          inventory.forEach(item => {
            console.log(`  - ${item.sku} (${item.name}): Good=${item.goodQty}, Defective=${item.defectiveQty}`);
          });
        } catch (e) {
          console.log(`Response: ${data.substring(0, 200)}`);
        }
        resolve();
      });
    });

    req.on('error', err => {
      console.log(`\n✗ Technician ${techId}: Error - ${err.message}`);
      resolve();
    });

    req.end();
  });
};

console.log('Testing technician inventory endpoint...');
await testEndpoint(1);
await testEndpoint(2);
console.log('\n✓ Test complete');
