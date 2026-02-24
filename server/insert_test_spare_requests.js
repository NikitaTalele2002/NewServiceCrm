import { sequelize } from "./db.js";
import { 
  Technicians, 
  Calls,
  SpareRequest,
  SpareRequestItem,
  SparePart,
  Status,
  ServiceCenter
} from "./models/index.js";

async function createTestSpareRequestsWithExistingCalls() {
  try {
    console.log("🔍 Checking for existing calls and technicians...\n");

    // Get available calls
    const calls = await Calls.findAll({
      attributes: ['call_id', 'assigned_asc_id', 'assigned_tech_id'],
      limit: 20,
      raw: true,
    });

    console.log(`✅ Found ${calls.length} calls in database`);

    // Get active technicians
    const technicians = await Technicians.findAll({
      where: { status: 'active' },
      attributes: ['technician_id', 'name', 'service_center_id'],
      limit: 5,
      raw: true,
    });

    console.log(`✅ Found ${technicians.length} active technicians\n`);

    if (calls.length === 0 || technicians.length === 0) {
      console.log("❌ Not enough data to create test requests");
      await sequelize.close();
      process.exit(0);
    }

    // Get spare parts
    const spareParts = await SparePart.findAll({
      attributes: ['Id', 'PART', 'DESCRIPTION'],
      limit: 20,
      raw: true,
    });

    console.log(`✅ Found ${spareParts.length} spare parts\n`);

    // Get status
    let status = await Status.findOne({
      where: { status_name: 'pending' },
      attributes: ['status_id'],
      raw: true,
    });

    if (!status) {
      status = { status_id: 1 };
    }

    console.log(`\n📊 Creating spare requests...\n`);

    let requestCount = 0;
    let itemCount = 0;

    // Create requests using available data
    for (let i = 0; i < Math.min(5, technicians.length); i++) {
      const tech = technicians[i];
      const call = calls[i % calls.length]; // Use available calls in rotation

      try {
        // Create spare request
        const spareRequest = await SpareRequest.create({
          request_type: i % 2 === 0 ? 'normal' : 'urgent',
          call_id: call.call_id, // Use existing call
          requested_source_type: 'technician',
          requested_source_id: tech.technician_id,
          requested_to_type: 'service_center',
          requested_to_id: tech.service_center_id,
          request_reason: i % 3 === 0 ? 'defect' : i % 3 === 1 ? 'replacement' : 'bulk',
          status_id: status.status_id,
          created_by: null,
          created_at: new Date(),
          updated_at: new Date(),
        });

        console.log(`✅ Request #${spareRequest.request_id}: ${tech.name} → SC ${tech.service_center_id}`);
        console.log(`   Call ID: ${call.call_id} | Type: ${i % 2 === 0 ? 'normal' : 'urgent'}`);

        requestCount++;

        // Add 2-4 spare items to this request
        const itemCountRandom = Math.floor(Math.random() * 3) + 2; // 2-4 items
        const selectedParts = spareParts
          .sort(() => Math.random() - 0.5)
          .slice(0, itemCountRandom);

        for (const part of selectedParts) {
          const requestedQty = Math.floor(Math.random() * 3) + 1; // 1-3 qty

          await SpareRequestItem.create({
            request_id: spareRequest.request_id,
            spare_id: part.Id,
            requested_qty: requestedQty,
            approved_qty: 0,
            rejection_reason: null,
            unit_price: null,
            line_price: null,
            created_at: new Date(),
            updated_at: new Date(),
          });

          console.log(`   + ${part.PART.padEnd(15)} | Qty: ${requestedQty}x | ${part.DESCRIPTION?.substring(0, 40)}`);
          itemCount++;
        }
        console.log('');

      } catch (error) {
        console.error(`❌ Error creating request for ${tech.name}:`, error.message);
      }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ SUCCESS! Test data created successfully!`);
    console.log(`${'='.repeat(70)}`);
    console.log(`\n📈 Summary:`);
    console.log(`   ✓ Spare Requests Created: ${requestCount}`);
    console.log(`   ✓ Spare Items Added: ${itemCount}`);
    console.log(`\n🌐 Next Steps:`);
    console.log(`   1. Start Server: npm start (in root directory)`);
    console.log(`   2. Login as Service Center user`);
    console.log(`   3. Go to: Rental Allocation page`);
    console.log(`   4. You should see ${requestCount} pending technician requests`);
    console.log(`   5. Click "Review" to approve/reject`);
    console.log(`\n📡 API Endpoint (for testing):`);
    console.log(`   GET http://localhost:5000/api/technician-spare-requests`);
    console.log(`   (Add Authorization header with Bearer token)`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createTestSpareRequestsWithExistingCalls();
