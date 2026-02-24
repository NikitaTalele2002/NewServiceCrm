import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

// Mock authentication
const jwtSecret = 'supersecret_jwt_key_change_me'; // Match the server's JWT_SECRET
const token = jwt.sign(
  { 
    id: 1, 
    username: 'SCUser',
    centerId: 4, 
    role: 'service_center'
  }, 
  jwtSecret, 
  { expiresIn: '24h' }
);

async function simulateFrontendFlow() {
  try {
    console.log('🧪 Simulating TechnicianCurrentInventory Frontend Flow\n');
    console.log('📝 Scenario: ASC Manager selects "Rahul Patil" from dropdown\n');

    // Step 1: Fetch all technicians (simulates initial load)
    console.log('Step 1️⃣  Fetching technicians list...');
    const techResponse = await fetch(
      'http://localhost:5000/api/technicians/by-centre?centerId=4',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    if (!techResponse.ok) {
      throw new Error(`Technicians API error: ${techResponse.status}`);
    }

    const techData = await techResponse.json();
    console.log(`✅ Got ${techData.technicians.length} technicians\n`);

    // Test with first technician (Rahul Patil - should have inventory)
    const selectedTechnicianId = techData.technicians.find(t => t.Name === 'Rahul Patil')?.Id || techData.technicians[0].Id;
    console.log(`📌 Selected: ${techData.technicians.find(t => t.Id === selectedTechnicianId)?.Name} (ID: ${selectedTechnicianId})\n`);

    // Step 2: Fetch all inventory (simulates new endpoint call)
    console.log('Step 2️⃣  Fetching service center inventory...');
    const invResponse = await fetch(
      'http://localhost:5000/api/technician-spare-requests/service-center/inventory',
      { 
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!invResponse.ok) {
      const errorText = await invResponse.text();
      console.log(`Error response: ${errorText}`);
      throw new Error(`Inventory API error: ${invResponse.status}`);
    }

    const invData = await invResponse.json();
    console.log(`✅ Got inventory data for ${invData.technicians.length} technicians\n`);

    // Step 3: Filter for selected technician (simulates frontend logic)
    console.log(`Step 3️⃣  Filtering for selected technician (ID: ${selectedTechnicianId})...`);
    const selectedTechInventory = invData.technicians.find(
      t => Number(t.technician_id) === Number(selectedTechnicianId)
    );

    if (!selectedTechInventory) {
      throw new Error(`No inventory found for technician ${selectedTechnicianId}`);
    }

    console.log(`✅ Found ${selectedTechInventory.inventory.length} items\n`);

    // Step 4: Display results
    console.log('📊 RESULTS FOR DISPLAY:');
    console.log(`Technician: ${selectedTechInventory.technician_name}`);
    console.log(`Email: ${selectedTechInventory.technician_email}`);
    console.log(`Mobile: ${selectedTechInventory.technician_mobile}`);
    console.log(`\nInventory Items:`);
    
    selectedTechInventory.inventory.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.PART}`);
      console.log(`     Description: ${item.DESCRIPTION}`);
      console.log(`     Qty Good: ${item.qty_good}, Defective: ${item.qty_defective}`);
    });

    console.log('\n✅ FLOW SIMULATION SUCCESS - Frontend will work correctly!');
    console.log('\n💡 Key Points:');
    console.log('  ✓ Technicians API returns correct format with Id field');
    console.log('  ✓ Service-center inventory endpoint returns nested array structure');
    console.log('  ✓ Frontend can filter by matching technician_id to Id');
    console.log('  ✓ Inventory items are accessible and displayable');

  } catch (err) {
    console.error('❌ Error in flow:', err.message);
  }

  process.exit(0);
}

// Run after a short delay to ensure servers are ready
setTimeout(simulateFrontendFlow, 2000);
