/**
 * Generate a test token and call API
 */
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const SECRET_KEY = 'supersecret_jwt_key_change_me';

async function test() {
  try {
    console.log('🧪 Testing API with generated token\n');
    
    // Generate a test token
    const token = jwt.sign({
      id: 1,
      email: 'test@example.com',
      centerId: 4,  // Service center ID 4
      role: 'service_center'
    }, SECRET_KEY, { expiresIn: '1h' });
    
    console.log('📝 Generated token for service center ID: 4\n');
    
    // Test the endpoint
    console.log('📤 Calling GET /api/spare-requests?status=Allocated...\n');
    const response = await fetch('http://localhost:5000/api/spare-requests?status=Allocated', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.log('❌ Error response:', error);
    } else {
      const data = await response.json();
      console.log('✅ Response data:');
      console.log(`Total requests: ${data.length}\n`);
      
      if (data.length > 0) {
        console.log('First 3 requests:');
        data.slice(0, 3).forEach((req, i) => {
          console.log(`\n${i + 1}. Request #${req.id}`);
          console.log(`   - Technician: ${req.technicianName}`);
          console.log(`   - Status: ${req.status}`);
          console.log(`   - Created: ${req.createdAt}`);
          console.log(`   - Items: ${req.items.length}`);
          if (req.items.length > 0) {
            req.items.forEach(item => {
              console.log(`   - Spare ID ${item.spareId}: ${item.requestedQty} requested`);
            });
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
