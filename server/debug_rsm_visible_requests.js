// debug_rsm_visible_requests.js
// Usage: node debug_rsm_visible_requests.js <rsmUserId>
// Prints all spare requests visible to the RSM based on their assigned states and plant_ids.

import { sequelize, SpareRequest, ServiceCenter, Plant, RSMStateMapping } from './models/index.js';

async function debugRsmVisibleRequests(rsmUserId) {
  if (!rsmUserId) {
    console.error('Usage: node debug_rsm_visible_requests.js <rsmUserId>');
    process.exit(1);
  }
  try {
    // Find all state_ids assigned to this RSM
    const mappings = await RSMStateMapping.findAll({ where: { rsm_user_id: rsmUserId, is_active: true } });
    const stateIds = mappings.map(m => m.state_id);
    if (!stateIds.length) {
      console.log('No states assigned to RSM:', rsmUserId);
      return;
    }
    // Find all plants in those states
    const plants = await Plant.findAll({ where: { state_id: stateIds } });
    const plantIds = plants.map(p => p.plant_id);
    if (!plantIds.length) {
      console.log('No plants found for RSM states:', stateIds);
      return;
    }
    // Find all spare requests submitted to these plants
    const requests = await SpareRequest.findAll({ where: { requested_to_id: plantIds } });
    if (!requests.length) {
      console.log('No requests found for plants:', plantIds);
      return;
    }
    console.log(`Requests visible to RSM ${rsmUserId} (plants: ${plantIds.join(', ')}):`);
    for (const req of requests) {
      console.log(`  RequestId: ${req.request_id}, From ServiceCenter: ${req.requested_source_id}, To Plant: ${req.requested_to_id}, Reason: ${req.request_reason}, Status: ${req.status_id}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

const [,, rsmUserId] = process.argv;
debugRsmVisibleRequests(rsmUserId);
