import { sequelize } from './db.js';

async function testTechnicianAPI() {
  try {
    console.log('🧪 Testing Technician API Response\n');

    // Simulate the API endpoint call using CORRECT column names
    console.log('📋 Query: technicians for service center ID 4');
    const technicians = await sequelize.query(`
      SELECT 
        technician_id as Id,
        name as Name,
        email as Email,
        mobile_no as MobileNo,
        service_center_id as ServiceCenterId,
        status as Status,
        created_at as CreatedDate
      FROM technicians
      WHERE service_center_id = 4 AND status = 'active'
      ORDER BY name
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`\n✅ Result: ${technicians.length} technicians found\n`);

    // Format as API response
    const apiResponse = {
      success: true,
      technicians
    };

    console.log('📋 API Response structure:');
    console.log(JSON.stringify(apiResponse, null, 2));

    if (technicians.length > 0) {
      console.log('\n✅ First technician object:');
      console.log('   Id:', technicians[0].Id);
      console.log('   Name:', technicians[0].Name);
      console.log('   Email:', technicians[0].Email);
      console.log('   MobileNo:', technicians[0].MobileNo);
    }

    console.log('\n✅ API Response is ready for frontend consumption');

    await sequelize.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('❌ Stack:', err.stack);
    process.exit(1);
  }
}

testTechnicianAPI();
