/**
 * Diagnostic Script for Stock Movement Issue
 * Tests the receive-delivery endpoint with detailed logging
 */

import fetch from 'node-fetch';
import readline from 'readline';

const BASE_URL = 'http://localhost:5000';
let authToken = '';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function login() {
  try {
    console.log('\n🔑 === LOGIN ===');
    const email = await askQuestion('Email (e.g., sc_pimpri@example.com): ');
    const password = await askQuestion('Password: ');

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (!data.token) {
      console.log('❌ Login failed');
      console.log('Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    authToken = data.token;
    console.log('✅ Logged in successfully');
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
    console.log(`   User ID: ${data.user?.user_id || data.user?.id}`);
    console.log(`   Service Center ID: ${data.user?.centerId || data.user?.service_center_id}`);

    return data.user;
  } catch (error) {
    console.error('❌ Login error:', error.message);
    process.exit(1);
  }
}

async function testReceiveDelivery() {
  try {
    console.log('\n📦 === TEST RECEIVE DELIVERY ===');
    
    const requestId = await askQuestion('Request ID (e.g., 22): ');
    const documentType = await askQuestion('Document Type (DN or CHALLAN): ');
    const documentNumber = await askQuestion('Document Number (e.g., DN-20250216-ABC): ');
    const plantId = await askQuestion('Plant ID (e.g., 1): ');
    const sparePart1 = await askQuestion('Spare ID 1 (e.g., 160): ');
    const qty1 = await askQuestion('Quantity 1 (e.g., 5): ');
    const carton1 = await askQuestion('Carton Number 1 (e.g., CARTON-001): ');

    const items = [
      {
        spare_id: parseInt(sparePart1),
        qty: parseInt(qty1),
        carton_number: carton1,
        condition: 'good'
      }
    ];

    console.log('\n📝 Sending request with payload:');
    const payload = {
      requestId: parseInt(requestId),
      documentType,
      documentNumber,
      plants: parseInt(plantId),
      items
    };
    console.log(JSON.stringify(payload, null, 2));

    console.log('\n⏳ Calling /api/logistics/receive-delivery...');
    
    const response = await fetch(`${BASE_URL}/api/logistics/receive-delivery`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    console.log('\n📨 Response received:');
    console.log(`Status: ${response.status}`);
    console.log(JSON.stringify(result, null, 2));

    if (result.ok) {
      console.log('\n✅ SUCCESS!');
      console.log(`Movement ID: ${result.data.movement.movement.movement_id}`);
      console.log(`Items Received: ${result.data.itemsReceived}`);
      console.log(`Total Qty: ${result.data.totalQtyReceived}`);

      if (result.data.inventory.source.length > 0) {
        console.log('\n📦 Plant Inventory Changes:');
        result.data.inventory.source.forEach(inv => {
          console.log(`  Spare ${inv.spare_id}: ${inv.oldQty} → ${inv.newQty}`);
        });
      }

      if (result.data.inventory.destination.length > 0) {
        console.log('\n📦 ASC Inventory Changes:');
        result.data.inventory.destination.forEach(inv => {
          console.log(`  Spare ${inv.spare_id}: ${inv.oldQty} → ${inv.newQty}`);
        });
      }
    } else {
      console.log('\n❌ ERROR!');
      console.log(`Error: ${result.error}`);
      if (result.details) {
        console.log(`Details: ${result.details}`);
      }
    }

  } catch (error) {
    console.error('❌ Request error:', error.message);
  }
}

async function checkDatabase() {
  try {
    console.log('\n💾 === CHECK DATABASE ===');
    
    const requestId = await askQuestion('Request ID to check data for (e.g., 22): ');

    console.log(`\nSearching for data related to request ${requestId}...`);

    // This would simulate database queries - in reality, you'd need a separate endpoint
    console.log('To check database, run these SQL queries:\n');
    
    console.log('1. Stock Movements:');
    console.log(`   SELECT * FROM stock_movement WHERE reference_no LIKE '%DN-%' ORDER BY created_at DESC LIMIT 10;`);
    
    console.log('\n2. Goods Movement Items:');
    console.log(`   SELECT gmi.* FROM goods_movement_items gmi`);
    console.log(`   JOIN stock_movement sm ON gmi.movement_id = sm.movement_id`);
    console.log(`   ORDER BY gmi.created_at DESC LIMIT 10;`);
    
    console.log('\n3. Cartons:');
    console.log(`   SELECT * FROM cartons ORDER BY created_at DESC LIMIT 10;`);
    
    console.log('\n4. Inventory Changes:');
    console.log(`   SELECT * FROM spare_inventory ORDER BY updated_at DESC LIMIT 20;`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function runDiagnostics() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  STOCK MOVEMENT DIAGNOSTIC TOOL                ║');
  console.log('╚════════════════════════════════════════════════╝');

  try {
    // Login
    await login();

    // Menu
    let running = true;
    while (running) {
      console.log('\n📋 === MENU ===');
      console.log('1. Test Receive Delivery');
      console.log('2. Check Database Queries');
      console.log('3. Exit');

      const choice = await askQuestion('\nSelect option (1-3): ');

      switch (choice) {
        case '1':
          await testReceiveDelivery();
          break;
        case '2':
          await checkDatabase();
          break;
        case '3':
          running = false;
          console.log('\n👋 Goodbye!');
          break;
        default:
          console.log('❌ Invalid option');
      }
    }

  } catch (error) {
    console.error('Fatal error:', error.message);
  } finally {
    rl.close();
  }
}

// Run diagnostics
runDiagnostics().catch(console.error);
