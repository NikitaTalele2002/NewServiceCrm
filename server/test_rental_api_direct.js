/**
 * Test the rental allocation endpoint directly to see what's being returned
 */
import axios from 'axios';
import jwt from 'jsonwebtoken';

// Create a token for SC 1 (Service Center with ID 1)
const token = jwt.sign({
  id: 10,
  userId: 10,
  role: 'service_center',
  centerId: 1,
  service_center_id: 1,
  username: 'sc_branch_1',
  email: 'sc@branch1.com'
}, 'supersecret_jwt_key_change_me', { expiresIn: '24h' });

console.log('\n' + '='.repeat(60));
console.log('🧪 TESTING RENTAL ALLOCATION API RESPONSE');
console.log('='.repeat(60));

try {
  const response = await axios.get('http://localhost:5000/api/technician-sc-spare-requests/rental-allocation', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('\n✅ API Response Status:', response.status);
  console.log('\n📊 Response Data Summary:');
  console.log('- Success:', response.data.success);
  console.log('- Total Requests:', response.data.summary?.totalRequests);

  if (response.data.data && response.data.data.length > 0) {
    const req22 = response.data.data.find(r => r.requestId === 22);
    
    if (req22) {
      console.log('\n🎯 REQUEST 22 DETAILS:');
      console.log('- Request ID:', req22.requestId);
      console.log('- Technician:', req22.technicianName);
      console.log('- Items Count:', req22.items?.length);
      
      if (req22.items && req22.items.length > 0) {
        console.log('\n📋 FIRST ITEM STRUCTURE:');
        const firstItem = req22.items[0];
        console.log('  Full Item:', JSON.stringify(firstItem, null, 2));
        
        console.log('\n📋 ALL ITEMS:');
        req22.items.forEach((item, idx) => {
          console.log(`  Item ${idx + 1}:`);
          console.log(`    - itemId: ${item.itemId}`);
          console.log(`    - spareId: ${item.spareId}`);
          console.log(`    - partCode: ${item.partCode}`);
          console.log(`    - partDescription: ${item.partDescription}`);
          console.log(`    - requestedQty: ${item.requestedQty}`);
          console.log(`    - availableQty: ${item.availableQty}`);
          console.log(`    - availability_status: ${item.availability_status}`);
        });
      } else {
        console.log('\n⚠️ Request 22 has NO ITEMS!');
      }
    } else {
      console.log('\n⚠️ Request 22 NOT FOUND in response!');
      console.log('\nAvailable requests:');
      response.data.data.forEach(r => {
        console.log(`  - Request ${r.requestId}: ${r.technicianName} (${r.items?.length || 0} items)`);
      });
    }
  }

} catch (err) {
  console.error('\n❌ Error testing API:', err.message);
  if (err.response) {
    console.error('Response Status:', err.response.status);
    console.error('Response Data:', err.response.data);
  }
}
