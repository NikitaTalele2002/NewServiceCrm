import { sequelize } from "./db.js";

async function verifyData() {
  try {
    console.log("🔍 Verifying test data...\n");

    // Check spare requests
    const requestsResult = await sequelize.query(`
      SELECT TOP 5 sr.request_id, sr.call_id, sr.requested_to_id, t.name, sr.created_at
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      WHERE sr.requested_source_type = 'technician'
      ORDER BY sr.created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    const requests = Array.isArray(requestsResult) ? requestsResult : [];

    console.log("📦 Spare Requests:");
    if (requests.length === 0) {
      console.log("   ❌ No spare requests found");
    } else {
      requests.forEach(r => {
        console.log(`   ✅ Request #${r.request_id} | Technician: ${r.name} | Call: ${r.call_id} | SC: ${r.requested_to_id}`);
      });
    }

    // Check spare request items
    console.log("\n🎁 Spare Request Items:");
    const itemsResult = await sequelize.query(`
      SELECT TOP 5 sri.request_id, COUNT(*) as item_count
      FROM spare_request_items sri
      GROUP BY sri.request_id
    `, { type: sequelize.QueryTypes.SELECT });

    const items = Array.isArray(itemsResult) ? itemsResult : [];

    if (items.length === 0) {
      console.log("   ❌ No spare request items found");
    } else {
      items.forEach(i => {
        console.log(`   ✅ Request #${i.request_id} | Items: ${i.item_count}`);
      });
    }

    // Check service centers
    console.log("\n🏢 Service Centers:");
    const scResult = await sequelize.query(`
      SELECT TOP 5 service_center_id, name FROM service_center
    `, { type: sequelize.QueryTypes.SELECT });

    const serviceCenters = Array.isArray(scResult) ? scResult : [];

    if (serviceCenters.length === 0) {
      console.log("   ❌ No service centers found");
    } else {
      serviceCenters.forEach(sc => {
        console.log(`   ✅ SC #${sc.service_center_id} | Name: ${sc.name}`);
      });
    }

    // Check technicians
    console.log("\n👨‍🔧 Technicians:");
    const techsResult = await sequelize.query(`
      SELECT TOP 5 technician_id, name, service_center_id FROM technicians WHERE status = 'active'
    `, { type: sequelize.QueryTypes.SELECT });

    const techs = Array.isArray(techsResult) ? techsResult : [];

    if (techs.length === 0) {
      console.log("   ❌ No active technicians found");
    } else {
      techs.forEach(t => {
        console.log(`   ✅ Tech #${t.technician_id} | Name: ${t.name} | SC: ${t.service_center_id}`);
      });
    }

    console.log("\n✅ Verification complete!");

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

verifyData();
