import { connectDB, sequelize } from './db.js';
import {
  Calls,
  CallSpareUsage,
  TATTracking,
  TATHolds,
  SpareInventory,
  Technicians,
  Users,
  SparePart,
} from './models/index.js';

/**
 * Random data generator functions
 */
const generateRandomData = {
  // Generate random integer between min and max
  randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  
  // Generate random date in the past N days
  randomDate: (daysBack = 7) => {
    const date = new Date();
    date.setDate(date.getDate() - generateRandomData.randomInt(0, daysBack));
    date.setHours(generateRandomData.randomInt(0, 23));
    date.setMinutes(generateRandomData.randomInt(0, 59));
    return date;
  },
  
  // Generate random dates with specific constraints
  dateRange: (startDate, endDate) => {
    return new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
  },
  
  // Random allocation status
  allocationStatus: () => {
    const statuses = ['USED', 'PARTIAL', 'NOT_USED'];
    return statuses[generateRandomData.randomInt(0, statuses.length - 1)];
  },
  
  // Random TAT status
  tatStatus: () => {
    const statuses = ['in_progress', 'within_tat', 'breached', 'resolved'];
    return statuses[generateRandomData.randomInt(0, statuses.length - 1)];
  },
  
  // Random TAT hold reasons
  holdReason: () => {
    const reasons = [
      'Spare part not available',
      'Spare part delayed in transit',
      'Waiting for customer approval',
      'Waiting for spare replacement',
      'Customer not available',
      'Additional defect identified',
      'Logistics delay',
      'Supply chain issue',
      'Technician not available',
    ];
    return reasons[generateRandomData.randomInt(0, reasons.length - 1)];
  },
};

/**
 * Main function to insert test data
 */
async function insertSpareConsumptionData() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    console.log('✓ Database connected');

    // 1. Fetch all calls (orders by most recent)
    console.log('\n📋 Fetching active calls...');
    const activeCalls = await Calls.findAll({
      limit: 20,
      raw: true,
      order: [['call_id', 'DESC']],
    });

    if (activeCalls.length === 0) {
      console.log('⚠️  No active calls found. Please create calls first.');
      process.exit(1);
    }

    console.log(`✓ Found ${activeCalls.length} active calls`);

    // 2. Fetch available spare parts for potential allocation
    console.log('\n📦 Fetching available spare parts...');
    const spareParts = await SparePart.findAll({
      limit: 50,
      raw: true,
    });

    if (spareParts.length === 0) {
      console.log('⚠️  No spare parts found. Please add spare parts first.');
      process.exit(1);
    }

    console.log(`✓ Found ${spareParts.length} spare parts`);

    // 3. Fetch technicians
    console.log('\n👨‍🔧 Fetching technicians...');
    const technicians = await Technicians.findAll({
      limit: 20,
      raw: true,
    });

    if (technicians.length === 0) {
      console.log('⚠️  No technicians found.');
      process.exit(1);
    }

    console.log(`✓ Found ${technicians.length} technicians`);

    // 4. Insert data into call_spare_usage (call_spare_consumption)
    console.log('\n💾 Inserting Call Spare Consumption Data...');
    const spareConsumptionInserts = [];

    for (const call of activeCalls) {
      const numSpares = generateRandomData.randomInt(1, 3);

      for (let i = 0; i < numSpares; i++) {
        const spare = spareParts[generateRandomData.randomInt(0, spareParts.length - 1)];
        const tech = technicians[generateRandomData.randomInt(0, technicians.length - 1)];
        const issuedQty = generateRandomData.randomInt(1, 3);
        const usedQty = generateRandomData.randomInt(0, issuedQty);
        const returnedQty = issuedQty - usedQty;

        spareConsumptionInserts.push({
          call_id: call.call_id,
          spare_part_id: spare.Id || spare.spare_part_id, // Try both field names
          defect_id: null,
          issued_qty: issuedQty,
          used_qty: usedQty,
          returned_qty: returnedQty,
          usage_status: usedQty === 0 ? 'NOT_USED' : usedQty < issuedQty ? 'PARTIAL' : 'USED',
          used_by_tech_id: tech.user_id,
          used_at: generateRandomData.randomDate(3),
          remarks: `Spare used during technician visit for call ${call.call_id}`,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    // Batch insert using raw SQL
    if (spareConsumptionInserts.length > 0) {
      const sqlValues = spareConsumptionInserts.map(cs => {
        const usedAt = new Date(cs.used_at).toISOString();
        const createdAt = new Date(cs.created_at).toISOString();
        const updatedAt = new Date(cs.updated_at).toISOString();
        
        return `(
          ${cs.call_id},
          ${cs.spare_part_id},
          ${cs.defect_id === null ? 'NULL' : cs.defect_id},
          ${cs.issued_qty},
          ${cs.used_qty},
          ${cs.returned_qty},
          '${cs.usage_status}',
          ${cs.used_by_tech_id === null ? 'NULL' : cs.used_by_tech_id},
          '${usedAt}',
          '${cs.remarks}',
          '${createdAt}',
          '${updatedAt}'
        )`;
      }).join(',');

      const sql = `
        INSERT INTO call_spare_usage 
        (call_id, spare_part_id, defect_id, issued_qty, used_qty, returned_qty, usage_status, used_by_tech_id, used_at, remarks, created_at, updated_at)
        VALUES ${sqlValues}
      `;

      try {
        const [result] = await sequelize.query(sql);
        console.log(`✓ Inserted ${spareConsumptionInserts.length} spare consumption records using raw SQL`);
      } catch (err) {
        console.error('Error with raw SQL insert:', err.message);
        // Fallback: insert one by one
        let successCount = 0;
        for (const cs of spareConsumptionInserts) {
          try {
            await CallSpareUsage.create(cs);
            successCount++;
          } catch (e) {
            console.error(`Failed to insert spare usage for call ${cs.call_id}:`, e.message);
          }
        }
        console.log(`✓ Inserted ${successCount} spare consumption records (one by one)`);
      }
    } else {
      console.log('⚠️ No spare consumption records to insert');
    }

    // 5. Insert data into tat_tracking
    console.log('\n⏱️  Inserting TAT Tracking Data...');
    const tatTrackingInserts = [];

    for (const call of activeCalls) {
      // Check if TAT tracking already exists for this call
      const existingTAT = await TATTracking.findOne({
        where: { call_id: call.call_id },
      });

      if (!existingTAT) {
        const startTime = generateRandomData.randomDate(5);
        const endTime = new Date(startTime.getTime() + generateRandomData.randomInt(2, 48) * 60 * 60 * 1000);
        const holdMinutes = generateRandomData.randomInt(0, 480); // 0 to 8 hours

        tatTrackingInserts.push({
          call_id: call.call_id,
          tat_start_time: startTime,
          tat_end_time: Math.random() > 0.3 ? endTime : null, // 70% have end time
          tat_status: Math.random() > 0.3 ? generateRandomData.tatStatus() : 'in_progress',
          total_hold_minutes: holdMinutes,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    const tatTrackingResult = await TATTracking.bulkCreate(tatTrackingInserts, {
      ignoreDuplicates: false,
    });

    console.log(`✓ Inserted ${tatTrackingResult.length} TAT tracking records`);
    tatTrackingInserts.slice(0, 5).forEach(tat => {
      console.log(
        `  • Call ${tat.call_id}: Status=${tat.tat_status}, Hold=${tat.total_hold_minutes}min`
      );
    });

    // 6. Insert data into tat_holds
    console.log('\n🛑 Inserting TAT Holds Data...');
    const tatHoldsInserts = [];

    // Select random subset of calls (about 40%)
    const callsWithHolds = activeCalls.filter(() => Math.random() > 0.6);

    for (const call of callsWithHolds) {
      const numHolds = generateRandomData.randomInt(1, 2);

      for (let i = 0; i < numHolds; i++) {
        const holdStartTime = generateRandomData.randomDate(3);
        const holdEndTime = Math.random() > 0.5
          ? new Date(holdStartTime.getTime() + generateRandomData.randomInt(1, 240) * 60 * 1000)
          : null;

        tatHoldsInserts.push({
          call_id: call.call_id,
          hold_reason: generateRandomData.holdReason(),
          hold_start_time: holdStartTime,
          hold_end_time: holdEndTime,
          created_by: technicians[generateRandomData.randomInt(0, technicians.length - 1)]?.user_id || null,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    const tatHoldsResult = await TATHolds.bulkCreate(tatHoldsInserts, {
      ignoreDuplicates: false,
    });

    console.log(`✓ Inserted ${tatHoldsResult.length} TAT hold records`);
    tatHoldsInserts.slice(0, 5).forEach(hold => {
      console.log(
        `  • Call ${hold.call_id}: Reason="${hold.hold_reason}"`
      );
    });

    // 7. Summary statistics
    console.log('\n📊 Data Insertion Summary:');
    console.log('═'.repeat(50));
    console.log(`✓ Spare Consumption Records: ${spareConsumptionInserts.length}`);
    console.log(`✓ TAT Tracking Records:       ${tatTrackingResult.length}`);
    console.log(`✓ TAT Hold Records:          ${tatHoldsResult.length}`);
    console.log(`✓ Total Calls Processed:     ${activeCalls.length}`);
    console.log('═'.repeat(50));

    // 8. Verification queries
    console.log('\n🔍 Verification Queries:');
    
    const spareUsageCount = await CallSpareUsage.count();
    console.log(`✓ Total spares in call_spare_usage: ${spareUsageCount}`);

    const tatCount = await TATTracking.count();
    console.log(`✓ Total records in tat_tracking: ${tatCount}`);

    const holdCount = await TATHolds.count();
    console.log(`✓ Total records in tat_holds: ${holdCount}`);

    console.log('\n✅ All data inserted successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error inserting spare consumption data:', err);
    console.error('\nStack Trace:', err.stack);
    process.exit(1);
  }
}

// Run the function
insertSpareConsumptionData();
