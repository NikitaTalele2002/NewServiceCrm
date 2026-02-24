import fetch from 'node-fetch';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAsInVzZXJuYW1lIjoiQ09DSElOLVJTTTEiLCJyb2xlIjoicnNtIiwiY2VudGVySWQiOm51bGwsInJzbUlkIjoxMCwiaWF0IjoxNzcxMDQ2ODY5LCJleHAiOjE3NzEwNzU2Njl9.aEcXd8Nbsbyio3ZH02_cgTMow3ZvHuMrgsTjhSEr1oA';

async function testApprovalFlow() {
  try {
    console.log('=== Testing Approval Workflow ===\n');

    // 1. Get pending requests as RSM1
    console.log('1. Getting pending requests for RSM1...');
    let response = await fetch('http://localhost:5000/api/rsm/spare-requests', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch:', response.status);
      const text = await response.text();
      console.error('Error:', text);
      return;
    }

    const data = await response.json();
    console.log(`✓ Found ${data.requests.modern.length} pending requests\n`);

    if (data.requests.modern.length === 0) {
      console.log('No pending requests to test approval');
      return;
    }

    const firstRequest = data.requests.modern[0];
    console.log(`Selected request ID: ${firstRequest.id} for testing\n`);

    // 2. Get details of the request BEFORE approval
    console.log('2. Getting request details BEFORE approval...');
    response = await fetch(`http://localhost:5000/api/spare-requests/${firstRequest.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    let requestDetails = await response.json();
    console.log('Before approval:');
    console.log(`  - Status: ${requestDetails.status_name}`);
    console.log(`  - Approver: ${requestDetails.approver ? requestDetails.approver.approver_name : 'None'}`);
    console.log(`  - Items: ${requestDetails.items ? requestDetails.items.length : 0}\n`);

    // 3. Approve the request
    console.log('3. Approving request as RSM1...');
    const approvals = {};
    if (requestDetails.items && requestDetails.items.length > 0) {
      requestDetails.items.forEach(item => {
        approvals[item.id] = { approvedQty: Math.floor(item.requested_qty / 2) };
      });
    }

    response = await fetch(`http://localhost:5000/api/rsm/spare-requests/${firstRequest.id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ approvals })
    });

    if (!response.ok) {
      console.error('Approval failed:', response.status);
      const err = await response.text();
      console.error('Error:', err);
      return;
    }

    const approvalResult = await response.json();
    console.log(`✓ Request approved successfully\n`);

    // 4. Get details of the request AFTER approval
    console.log('4. Getting request details AFTER approval...');
    response = await fetch(`http://localhost:5000/api/spare-requests/${firstRequest.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    requestDetails = await response.json();
    console.log('After approval:');
    console.log(`  - Status: ${requestDetails.status_name}`);
    console.log(`  - Approver: ${requestDetails.approver ? requestDetails.approver.approver_name : 'None'}`);
    console.log(`  - Items with approved qty:`);
    if (requestDetails.items) {
      requestDetails.items.forEach(item => {
        console.log(`    - ${item.sku}: requested=${item.requested_qty}, approved=${item.approved_qty}`);
      });
    }
    console.log();

    // 5. Check if the approved request is no longer visible to RSM1 in the pending list
    console.log('5. Checking if approved request is hidden from pending list...');
    response = await fetch('http://localhost:5000/api/rsm/spare-requests', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const updatedData = await response.json();
    const isRequestStillPending = updatedData.requests.modern.some(r => r.id === firstRequest.id);
    
    if (!isRequestStillPending) {
      console.log('✓ Approved request is properly hidden from pending list\n');
    } else {
      console.log('✗ ERROR: Approved request is still showing in pending list!\n');
    }

    console.log('=== Test Complete ===');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testApprovalFlow();
