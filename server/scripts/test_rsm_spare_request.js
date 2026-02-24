import fetch from 'node-fetch';
import { sequelize, SpareRequest } from '../models/index.js';

async function main() {
  try {
    // pick an existing RSM user mapped to a state
    const rsmRows = await sequelize.query('SELECT TOP 1 rsm_user_id FROM rsm_state_mapping WHERE is_active = 1', { type: sequelize.QueryTypes.SELECT });
    if (!rsmRows || rsmRows.length === 0) {
      console.error('No RSM mappings found in rsm_state_mapping. Please seed rsm_state_mapping first.');
      process.exit(1);
    }
    const rsmUserId = rsmRows[0].rsm_user_id;

    // find a PlantId reachable via plants or service_centers
    let branchRows = [];
    try {
      branchRows = await sequelize.query(
        `SELECT TOP 1 p.plant_id AS BranchId FROM plants p
         WHERE p.state_id IS NOT NULL AND p.plant_id IS NOT NULL`,
        { type: sequelize.QueryTypes.SELECT }
      );
    } catch (e1) {
      try {
        branchRows = await sequelize.query(
          `SELECT TOP 1 p.Id AS BranchId FROM Plants p
           WHERE p.state_id IS NOT NULL AND p.Id IS NOT NULL`,
          { type: sequelize.QueryTypes.SELECT }
        );
      } catch (e2) {
        try {
          branchRows = await sequelize.query(
            `SELECT TOP 1 sc.plant_id AS BranchId FROM service_centers sc
             WHERE sc.state_id IS NOT NULL AND sc.plant_id IS NOT NULL`,
            { type: sequelize.QueryTypes.SELECT }
          );
        } catch (e3) {
          // Fallback: try to find any plant/branch id referenced in existing spare_requests (new table)
          try {
            const req = await SpareRequest.findOne({ where: { requested_to_type: 'branch' } });
            if (req) branchRows = [{ BranchId: req.requested_to_id }];
          } catch (e4) {
            branchRows = [];
          }
        }
      }
    }

    if (!branchRows || branchRows.length === 0) {
      console.warn('No branch with linked ServiceCenter/state found. Skipping insert; will still call RSM endpoint.');
      // call RSM endpoint to ensure it responds gracefully
      const url = `http://localhost:5000/api/rsm/${rsmUserId}/spare-requests`;
      console.log('Calling RSM endpoint (no test insert):', url);
      const resp = await fetch(url);
      const data = await resp.json();
      console.log('RSM endpoint response:', JSON.stringify(data, null, 2));
      process.exit(0);
    }

    const branchId = branchRows[0].BranchId;

    // find a service center id to use as source (optional)
    // find a service center id to use as source (optional) - prefer asc_id or Id depending on schema
    let scRows = [];
    try {
      scRows = await sequelize.query('SELECT TOP 1 asc_id AS Id FROM service_centers WHERE plant_id = ?', { replacements: [branchId], type: sequelize.QueryTypes.SELECT });
    } catch (e1) {
      try {
        scRows = await sequelize.query('SELECT TOP 1 Id FROM service_centers WHERE plant_id = ?', { replacements: [branchId], type: sequelize.QueryTypes.SELECT });
      } catch (e2) {
        scRows = [];
      }
    }
    const serviceCenterId = scRows && scRows[0] ? scRows[0].Id : null;

    // create a spare_request in the new table pointing to this branch
    const newReq = await SpareRequest.create({
      request_type: 'normal',
      call_id: null,
      requested_source_type: serviceCenterId ? 'service_center' : 'branch',
      requested_source_id: serviceCenterId || branchId,
      // Per updated flow: when ASC creates request, mark destination as 'branch' and set requested_to_id to the ASC id
      requested_to_type: 'branch',
      requested_to_id: serviceCenterId || branchId,
      request_reason: 'msl',
      status_id: 1,
      created_by: 1
    });

    console.log('Inserted test spare_request id:', newReq.request_id, 'for branch', branchId);

    // call RSM endpoint
    const url = `http://localhost:5000/api/rsm/${rsmUserId}/spare-requests`;
    console.log('Calling RSM endpoint:', url);
    const resp = await fetch(url);
    const data = await resp.json();
    console.log('RSM endpoint response:', JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Test script failed:', err && err.message);
    process.exit(1);
  }
}

main();
