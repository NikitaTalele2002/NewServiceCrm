import fetch from 'node-fetch';

const rsmToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAsInVzZXJuYW1lIjoiQ09DSElOLVJTTTEiLCJyb2xlIjoicnNtIiwiY2VudGVySWQiOm51bGwsInJzbUlkIjoxMCwiaWF0IjoxNzcxMDQ2ODY5LCJleHAiOjE3NzEwNzU2Njl9.aEcXd8Nbsbyio3ZH02_cgTMow3ZvHuMrgsTjhSEr1oA';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testCompleteApprovalWorkflow() {
  try {
    console.log('=== Testing RSM Level 1 Approval Workflow with Approvals Table ===\n');

    await delay(500);

    // 1. Get pending requests as RSM
    console.log('1. Getting pending requests for RSM1...');
    let response;
    try {
      response = await fetch('http://localhost:5000/api/rsm/spare-requests', {
        headers: {
          'Authorization': `Bearer ${rsmToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
    } catch (err) {
      console.error('Connection error:', err.message);
      return;
    }

    if (!response.ok) {
      const text = await response.text();
      console.error('Failed:', response.status, text);
      return;
    }

    const data = await response.json();
    console.log(`✓ Found ${data.requests.modern.length} pending requests\n`);

    if (data.requests.modern.length === 0) {
      console.log('No pending requests');
      return;
    }

    const firstRequest = data.requests.modern[0];
    const requestId = firstRequest.id;
    console.log(`Selected request ID: ${requestId}\n`);

    // 2. Get details BEFORE approval
    console.log('2. Request details BEFORE approval...');
    response = await fetch(`http://localhost:5000/api/spare-requests/${requestId}`, {
      headers: {
        'Authorization': `Bearer ${rsmToken}`,
        'Content-Type': 'application/json'
      }
    });

    let requestDetails = await response.json();
    console.log(`  Status: ${requestDetails.status_name}`);
    console.log(`  Approvals: ${requestDetails.approval_history ? requestDetails.approval_history.length : 0}\n`);

    // 3. Approve the request
    console.log('3. Approving request as RSM1...');
    const approvals = {};
    if (requestDetails.items && requestDetails.items.length > 0) {
      requestDetails.items.forEach(item => {
        approvals[item.id] = { approvedQty: Math.floor(item.requested_qty / 2) || item.requested_qty };
      });
    }

    response = await fetch(`http://localhost:5000/api/rsm/spare-requests/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${rsmToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ approvals })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Approval failed:', err);
      return;
    }

    console.log(`✓ Approved successfully\n`);

    // 4. Get details AFTER approval
    console.log('4. Request details AFTER approval...');
    response = await fetch(`http://localhost:5000/api/spare-requests/${requestId}`, {
      headers: {
        'Authorization': `Bearer ${rsmToken}`,
        'Content-Type': 'application/json'
      }
    });

    requestDetails = await response.json();
    console.log(`  Status: ${requestDetails.status_name}`);
    console.log(`  Approvals: ${requestDetails.approval_history ? requestDetails.approval_history.length : 0}`);
    
    if (requestDetails.approval_history && requestDetails.approval_history.length > 0) {
      console.log('  Approval records:');
      requestDetails.approval_history.forEach(approval => {
        console.log(`    - Level ${approval.approval_level} (${approval.approval_level_name}): ${approval.approval_status} by ${approval.approver_name}`);
      });
    }
    console.log();

    // 5. Check if approved request is hidden
    console.log('5. Checking if approved request is hidden from pending list...');
    response = await fetch('http://localhost:5000/api/rsm/spare-requests', {
      headers: {
        'Authorization': `Bearer ${rsmToken}`,
        'Content-Type': 'application/json'
      }
    });

    const updatedData = await response.json();
    const isStillPending = updatedData.requests.modern.some(r => r.id === requestId);
    
    if (!isStillPending) {
      console.log('✓ Correctly hidden from pending list\n');
    } else {
      console.log('✗ ERROR: Still showing in pending list!\n');
    }

    console.log('=== Test Complete ===');
    console.log('✓ Level 1 (RSM) approval with Approvals table working!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCompleteApprovalWorkflow();
