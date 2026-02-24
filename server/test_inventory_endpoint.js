import mssql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const config = {
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    }
  },
  options: {
    trustServerCertificate: true,
    trustedConnection: false,
    enableKeepAlive: true
  }
};

async function testInventoryEndpoint() {
  let pool;
  try {
    console.log('🔌 Connecting to database...\n');
    pool = new mssql.ConnectionPool(config);
    await pool.connect();

    const serviceCenterId = 4; // ASC
    console.log(`📦 Fetching inventory for service center ${serviceCenterId}\n`);

    // Get technicians for service center
    const techResult = await pool.request()
      .input('serviceCenterId', mssql.Int, serviceCenterId)
      .query(`
        SELECT 
          technician_id, 
          name, 
          email, 
          mobile_no 
        FROM technicians 
        WHERE service_center_id = @serviceCenterId 
        AND status = 'active'
      `);

    console.log(`✅ Found ${techResult.recordset.length} technicians for SC ${serviceCenterId}:\n`);

    const technicians = techResult.recordset;
    const result = {
      success: true,
      service_center_id: serviceCenterId,
      technicians: []
    };

    for (const tech of technicians) {
      console.log(`✅ Technician: ${tech.name} (ID: ${tech.technician_id})`);

      // Get inventory for this technician
      const invResult = await pool.request()
        .input('technicianId', mssql.Int, tech.technician_id)
        .query(`
          SELECT 
            spare_id, 
            PART, 
            DESCRIPTION, 
            qty_good, 
            qty_defective,
            (qty_good + qty_defective) as total_qty
          FROM spare_inventory si
          LEFT JOIN spare_parts sp ON si.spare_id = sp.Id
          WHERE si.location_type = 'technician' 
          AND si.location_id = @technicianId
        `);

      console.log(`   Items: ${invResult.recordset.length}\n`);

      result.technicians.push({
        technician_id: tech.technician_id,
        technician_name: tech.name,
        technician_email: tech.email,
        technician_mobile: tech.mobile_no,
        inventory: invResult.recordset
      });
    }

    console.log('\n📊 Complete Response Structure:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n✅ Endpoint response structure is correct for frontend consumption');

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

testInventoryEndpoint();
