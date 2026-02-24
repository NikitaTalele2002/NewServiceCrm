/**
 * Simple HTTP Test: Call receive-delivery endpoint
 * Tests the endpoint directly with minimal setup
 */

const BASE_URL = 'http://localhost:5000';

async function testReceiveDelivery() {
  console.log('\n🔧 === RECEIVE DELIVERY ENDPOINT TEST ===\n');

  // Test payload based on user's REQ-25 example
  const payload = {
    requestId: 25,
    documentType: 'DN',
    documentNumber: 'DN-20260216-R8H2V',
    plants: 4, // Plant ID from earlier test
    items: [
      {
        spare_id: 0, // Spare part ID from earlier test
        qty: 1,
        carton_number: 'CTN-20260216-001',
        condition: 'good'
      }
    ]
  };

  console.log('📝 Request Payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n');

  try {
    console.log('🔄 Sending POST request to /api/logistics/receive-delivery...\n');
    
    const response = await fetch(`${BASE_URL}/api/logistics/receive-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    console.log(`📊 Response Status: ${response.status}\n`);
    console.log('📋 Response Body:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n');

    if (response.status === 201 && data.ok) {
      console.log('✅ SUCCESS! Request processed successfully\n');
      console.log('Response details:');
      console.log(`  Movement ID: ${data.movement?.movement?.movement_id}`);
      console.log(`  Total Qty: ${data.movement?.movement?.total_qty}`);
      console.log(`  Status: ${data.movement?.movement?.status}`);
    } else {
      console.log('❌ Request failed or had issues\n');
      if (!data.ok) {
        console.log(`Error: ${data.error || 'Unknown error'}`);
      }
    }

  } catch (error) {
    console.log('❌ Connection failed\n');
    console.log(`Error: ${error.message}\n`);
    console.log('Make sure the server is running at http://localhost:5000');
  }

  // Wait before checking database
  console.log('\n⏳ Waiting 3 seconds before checking database...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Check database
  await checkDatabase();
}

async function checkDatabase() {
  console.log('\n🔍 === CHECKING DATABASE ===\n');

  try {
    // Try to query the database using fetch to the server's health endpoint
    const response = await fetch(`${BASE_URL}/api/test`);
    const data = await response.json();

    if (data.ok) {
      console.log('✅ Database connection verified\n');
    }
  } catch (error) {
    console.log('❌ Could not verify database connection');
  }

  console.log('📝 To check if data was inserted, run:');
  console.log('  node test_stock_movement_direct.js\n');
}

testReceiveDelivery();
