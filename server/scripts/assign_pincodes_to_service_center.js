import { sequelize, ServiceCenter, ServiceCenterPincodes } from '../models/index.js';

/**
 * Assign multiple pincodes to one service center
 *
 * Usage:
 *   node scripts/assign_pincodes_to_service_center.js --ascId=4
 *
 * Data being assigned:
 *   - 422003 (Out city, 50 km)
 *   - 422004 (Out city, 50 km)
 *   - 422008 (Local, 14 km)
 *   - 422010 (Local, 2 km)
 *   - 422013 (Local, 24 km)
 */

// const mappings = [
//   { MAPPED_PINCODE: '422003', LOC: 'Out city', TWOWAYDISTANCE: 50 },
//   { MAPPED_PINCODE: '422004', LOC: 'Out city', TWOWAYDISTANCE: 50 },
//   { MAPPED_PINCODE: '422008', LOC: 'Local', TWOWAYDISTANCE: 14 },
//   { MAPPED_PINCODE: '422010', LOC: 'Local', TWOWAYDISTANCE: 2 },
//   { MAPPED_PINCODE: '422013', LOC: 'local', TWOWAYDISTANCE: 24 },
// ];

const mappings = [
  { MAPPED_PINCODE: '422104', LOC: 'Out city', TWOWAYDISTANCE: 132 },
  { MAPPED_PINCODE: '422201', LOC: 'Out city', TWOWAYDISTANCE: 68 },
  { MAPPED_PINCODE: '422202', LOC: 'Out city', TWOWAYDISTANCE: 110 },
  { MAPPED_PINCODE: '422205', LOC: 'Out city', TWOWAYDISTANCE: 104 },
  { MAPPED_PINCODE: '422210', LOC: 'Out city', TWOWAYDISTANCE: 76 },
  { MAPPED_PINCODE: '422213', LOC: 'local',   TWOWAYDISTANCE: 34 },
  { MAPPED_PINCODE: '422221', LOC: 'Out city', TWOWAYDISTANCE: 60 },
  { MAPPED_PINCODE: '422302', LOC: 'Out city', TWOWAYDISTANCE: 64 },
  { MAPPED_PINCODE: '422304', LOC: 'Out city', TWOWAYDISTANCE: 114 },
  { MAPPED_PINCODE: '422305', LOC: 'Out city', TWOWAYDISTANCE: 128 },
  { MAPPED_PINCODE: '422401', LOC: 'local',   TWOWAYDISTANCE: 34 },
  { MAPPED_PINCODE: '422501', LOC: 'local',   TWOWAYDISTANCE: 28 },
  { MAPPED_PINCODE: '422606', LOC: 'Out city', TWOWAYDISTANCE: 112 },
  { MAPPED_PINCODE: '423401', LOC: 'Out city', TWOWAYDISTANCE: 178 },
  { MAPPED_PINCODE: '423403', LOC: 'Out city', TWOWAYDISTANCE: 218 },
  { MAPPED_PINCODE: '422001', LOC: 'Local',   TWOWAYDISTANCE: 18 },
  { MAPPED_PINCODE: '422002', LOC: 'Local',   TWOWAYDISTANCE: 18 },
];




function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const [k, v] = arg.split('=');
    if (k && v) args[k.replace(/^--/, '')] = v;
  });
  return args;
}

function normalizeLocation(loc) {
  if (!loc) return 'local';
  const l = String(loc).toLowerCase();
  if (l.includes('out')) return 'out_city';
  return 'local';
}

async function run() {
  const args = parseArgs();
  
  try {
    await sequelize.authenticate();

    // Get all service centers or specific one
    const centers = await ServiceCenter.findAll({
      attributes: ['asc_id', 'asc_code', 'asc_name'],
    });

    if (centers.length === 0) {
      console.error('❌ No service centers found in database');
      process.exit(1);
    }

    let serviceCenter = null;

    if (args.ascId) {
      serviceCenter = await ServiceCenter.findOne({ where: { asc_id: parseInt(args.ascId, 10) } });
      if (!serviceCenter) {
        console.error(`❌ Service center with asc_id=${args.ascId} not found`);
        process.exit(1);
      }
    } else {
      // If no ascId provided, use the first (and usually only) service center
      if (centers.length === 1) {
        serviceCenter = centers[0];
        console.log('ℹ️  No ascId provided. Using the only service center in database.');
      } else {
        console.log('\n📌 Multiple service centers found. Please specify --ascId=X\n');
        centers.forEach(sc => {
          console.log(`  --ascId=${sc.asc_id}  =>  ${sc.asc_name} (code: ${sc.asc_code})`);
        });
        console.log();
        process.exit(1);
      }
    }

    console.log(`\n✓ Assigning pincodes to: ${serviceCenter.asc_name} (asc_id=${serviceCenter.asc_id})\n`);

    let created = 0, updated = 0, skipped = 0;

    for (const m of mappings) {
      const pincode = String(m.MAPPED_PINCODE).trim();
      const location_type = normalizeLocation(m.LOC);
      const two_way_distance = m.TWOWAYDISTANCE ? parseInt(m.TWOWAYDISTANCE, 10) : null;

      // Upsert: find existing by asc_id + pincode, or create new
      const [row, wasCreated] = await ServiceCenterPincodes.findOrCreate({
        where: {
          asc_id: serviceCenter.asc_id,
          serviceable_pincode: pincode,
        },
        defaults: {
          location_type,
          two_way_distance,
        },
      });

      if (wasCreated) {
        created += 1;
        console.log(`  ✓ Created: ${pincode} | ${location_type} | ${two_way_distance} km`);
      } else {
        // Update if fields differ
        let needUpdate = false;
        if (row.location_type !== location_type) {
          row.location_type = location_type;
          needUpdate = true;
        }
        const distVal = row.two_way_distance === null ? null : Number(row.two_way_distance);
        if ((distVal || 0) !== (two_way_distance || 0)) {
          row.two_way_distance = two_way_distance;
          needUpdate = true;
        }
        if (needUpdate) {
          await row.save();
          updated += 1;
          console.log(`  ~ Updated: ${pincode} | ${location_type} | ${two_way_distance} km`);
        } else {
          skipped += 1;
          console.log(`  = Exists: ${pincode}`);
        }
      }
    }

    console.log(`\n✅ Assignment Complete!`);
    console.log(`   Created: ${created}, Updated: ${updated}, Skipped: ${skipped}\n`);
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
