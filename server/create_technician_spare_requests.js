import { sequelize, sql, poolPromise } from "./db.js";
import { 
  Calls, 
  CallTechnicianAssignment, 
  Technicians, 
  SpareRequest, 
  SpareRequestItem, 
  SparePart, 
  Status, 
  ServiceCenter 
} from "./models/index.js";

async function createTechnicianSpareRequests() {
  try {
    console.log("Starting technician spare request creation...");

    // Get some active technicians with their assignments
    const technicians = await Technicians.findAll({
      where: { status: 'active' },
      include: [
        {
          model: ServiceCenter,
          as: 'serviceCenter',
          attributes: ['asc_id', 'asc_name'],
        }
      ],
      limit: 3,
      raw: false,
    });

    if (technicians.length === 0) {
      console.log("No active technicians found");
      return;
    }

    console.log(`Found ${technicians.length} active technicians`);

    // Get spare parts to use in requests
    const spareParts = await SparePart.findAll({
      attributes: ['Id', 'PART', 'DESCRIPTION'],
      limit: 10,
    });

    if (spareParts.length === 0) {
      console.log("No spare parts found");
      return;
    }

    console.log(`Found ${spareParts.length} spare parts`);

    // Get the pending status
    const pendingStatus = await Status.findOne({
      where: { status_name: 'pending' }
    });

    if (!pendingStatus) {
      // Create a default pending status if it doesn't exist
      const defaultStatus = {
        status_id: 1, // Use a default ID
        status_name: 'pending'
      };
      console.log("No pending status found, using default status_id: 1");
    }

    // Create requests for each technician
    for (const technician of technicians) {
      console.log(`\nCreating requests for technician: ${technician.name}`);

      // Get calls assigned to this technician
      const assignments = await CallTechnicianAssignment.findAll({
        where: { technician_id: technician.technician_id },
        attributes: ['call_id'],
        limit: 3,
      });

      if (assignments.length === 0) {
        console.log(`  No calls assigned to technician ${technician.name}`);
        continue;
      }

      // Create 1-2 spare requests per technician
      const requestsToCreate = assignments.slice(0, 2);

      for (let i = 0; i < requestsToCreate.length; i++) {
        const assignment = requestsToCreate[i];
        const serviceCenterId = technician.service_center_id;

        // Create spare request
        const spareRequest = await SpareRequest.create({
          request_type: 'normal',
          call_id: assignment.call_id,
          requested_source_type: 'technician',
          requested_source_id: technician.technician_id,
          requested_to_type: 'service_center',
          requested_to_id: serviceCenterId,
          request_reason: i % 2 === 0 ? 'defect' : 'replacement',
          status_id: pendingStatus?.status_id || 1,
          created_by: null,
          created_at: new Date(),
          updated_at: new Date(),
        });

        console.log(`  Created spare request: ${spareRequest.request_id} for call ${assignment.call_id}`);

        // Create 2-3 items in this request
        const itemCounts = [2, 3][Math.floor(Math.random() * 2)];
        const selectedParts = spareParts
          .sort(() => Math.random() - 0.5)
          .slice(0, itemCounts);

        for (const part of selectedParts) {
          const requestedQty = Math.floor(Math.random() * 3) + 1; // 1-3 qty

          const item = await SpareRequestItem.create({
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

          console.log(`    Added item: ${part.PART} (${part.DESCRIPTION}), Qty: ${requestedQty}`);
        }
      }
    }

    console.log("\n✓ Technician spare requests created successfully!");

    // Show summary
    const totalRequests = await SpareRequest.count({
      where: { requested_source_type: 'technician' }
    });

    const totalItems = await sequelize.query(`
      SELECT COUNT(*) as count FROM spare_request_items 
      WHERE request_id IN (
        SELECT request_id FROM spare_requests 
        WHERE requested_source_type = 'technician'
      )
    `, { raw: true });

    console.log(`\nSummary:`);
    console.log(`  Total technician requests: ${totalRequests}`);
    console.log(`  Total spare items in technician requests: ${totalItems[0][0].count}`);

  } catch (error) {
    console.error("Error creating technician spare requests:", error);
    console.error("Details:", error.message);
  } finally {
    await sequelize.close();
  }
}

// Run the script
createTechnicianSpareRequests();
