/**
 * Test the fixed technician inventory endpoint
 */
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const SECRET_KEY = 'supersecret_jwt_key_change_me';

async function test() {
  try {
    console.log('🧪 Testing fixed GET /api/spare-requests/technicians/:id/inventory\n');
    
    // Generate a test token
    const token = jwt.sign({
      id: 1,
      email: 'test@example.com',
      centerId: 4,
      role: 'service_center'
    }, SECRET_KEY, { expiresIn: '1h' });
    
    // Test for 2 different technicians
    const technicianIds = [1, 2];
    
    for (const techId of technicianIds) {
      console.log(`\n📝 Testing Technician ID: ${techId}`);
      console.log('━'.repeat(50));
      
      const response = await fetch(`http://localhost:5000/api/spare-requests/technicians/${techId}/inventory`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`Status: ${response.status}`);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Error:', error);
      } else {
        const data = await response.json();
        console.log(`✅ Inventory items: ${data.length}`);
        
        if (data.length > 0) {
          console.log('\nItems found:');
          data.slice(0, 3).forEach((item, i) => {
            console.log(`  ${i + 1}. ${item.spareName} (SKU: ${item.sku})`);
            console.log(`     Good: ${item.goodQty}, Defective: ${item.defectiveQty}`);
          });
          if (data.length > 3) {
            console.log(`  ... and ${data.length - 3} more items`);
          }
        } else {
          console.log('⚠️  No inventory found for this technician');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
