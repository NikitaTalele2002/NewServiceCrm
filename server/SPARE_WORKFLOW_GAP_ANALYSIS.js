/**
 * SPARE PARTS WORKFLOW - IMPLEMENTATION GAP ANALYSIS
 * 
 * This document analyzes the current implementation against your required workflow
 * and identifies specific gaps, issues, and areas needing fixes.
 */

const WORKFLOW_ANALYSIS = {
  title: "Complete Spare Parts Workflow Analysis",
  date: new Date().toISOString(),
  
  workflow: {
    step1: {
      name: "ASC allocates call to technician",
      description: "Call is assigned to technician (assigned_tech_id and assigned_asc_id)",
      implementation: "✅ WORKING",
      details: "Calls table has assigned_tech_id and assigned_asc_id fields. No issues seen."
    },
    
    step2: {
      name: "Tech requests spare_request to ASC (TECH_ISSUE type)",
      description: "Technician submits spare request for parts needed",
      implementation: "⚠️  PARTIAL - MISSING CALL_ID VERIFICATION",
      issues: [
        {
          code: "SR-001",
          severity: "HIGH",
          issue: "Spare request creation doesn't validate call_id",
          location: "spare-return-requests.js createReturnRequest()",
          problem: "No verification that call is assigned to the requesting technician",
          impact: "Technician can request spares for calls not assigned to them",
          fix: "ADD: Validate call_id belongs to requesting technician's assigned calls"
        },
        {
          code: "SR-002",
          severity: "MEDIUM",
          issue: "spare_request_type might not be properly set to TECH_ISSUE",
          location: "spare-return-requests.js",
          problem: "Field exists but unclear if it's being set correctly during creation",
          impact: "Inventory movements might not be properly categorized",
          fix: "VERIFY: Ensure spare_request_type='TECH_ISSUE' when tech requests spares"
        }
      ],
      recommendation: "Implement call validation in spare request creation"
    },
    
    step3: {
      name: "ASC allocates spare to tech - Inventory updates",
      description: "ASC decreases qty, Tech increases qty. Stock movements created.",
      implementation: "⚠️  PARTIAL - MISSING IN WORKFLOW",
      issues: [
        {
          code: "INV-001",
          severity: "HIGH",
          issue: "No allocation endpoint that updates inventory",
          location: "N/A - Missing route",
          problem: "There's no route/endpoint that allocates spares from ASC to Tech",
          impact: "Inventory is never updated when spares are allocated",
          detail: "You have verify endpoint but NO allocation endpoint. The workflow is: submit → receive → verify. Missing the allocation step.",
          fix: "CREATE: New POST endpoint /api/spare-requests/{requestId}/allocate"
        },
        {
          code: "INV-002",
          severity: "HIGH",
          issue: "Stock movements not properly created for TECH_ISSUE allocations",
          location: "spare-return-requests.js / StockMovement",
          problem: "No TECH_ISSUE_OUT/TECH_ISSUE_IN movements created during allocation",
          impact: "Inventory tracking is incomplete, cannot audit movements",
          fix: "ADD: Stock movement creation in allocation endpoint"
        },
        {
          code: "INV-003",
          severity: "HIGH",
          issue: "spare_inventory update missing for allocation",
          location: "spare-return-requests.js",
          problem: "Allocation endpoint doesn't update spare_inventory table",
          impact: "spare_inventory qtys never change, becomes useless",
          fix: "ADD: Update spare_inventory.qty_good for both ASC (decrease) and Tech (increase)"
        }
      ],
      recommendation: "Create allocation endpoint with complete inventory update logic"
    },
    
    step4: {
      name: "Tech replaces spare and records usage in call_spare_usage",
      description: "Record issued_qty, used_qty, returned_qty in call_spare_usage",
      implementation: "⚠️  PARTIALLY WORKING",
      issues: [
        {
          code: "CSU-001",
          severity: "MEDIUM",
          issue: "call_spare_usage might not distinguish between used vs excess",
          location: "technician-tracking.js line 130",
          problem: "Current usage only records basic quantities, unclear if excess is tracked",
          detail: "Table has issued_qty, used_qty, returned_qty but unclear if these are being properly populated",
          impact: "Cannot track what was actually used vs what is excess for return",
          fix: "VERIFY: Ensure used_qty and returned_qty are properly set when tech marks usage complete"
        },
        {
          code: "CSU-002",
          severity: "HIGH",
          issue: "No endpoint to update call_spare_usage after spare is replaced",
          location: "technician-tracking.js",
          problem: "Usage is inserted but how does tech indicate which qty was used vs excess?",
          impact: "Tech has no way to mark spares as used vs excess/defective",
          fix: "CREATE: Endpoint to update call_spare_usage with actual used_qty"
        }
      ],
      recommendation: "Ensure call_spare_usage properly tracks used vs excess quantities"
    },
    
    step5: {
      name: "Defective spare added to tech inventory",
      description: "Tech has defective spare in inventory (qty_defective field)",
      implementation: "⚠️  MISSING - NO DEFECTIVE TRACKING",
      issues: [
        {
          code: "DEF-001",
          severity: "HIGH",
          issue: "No mechanism to add defective spares to tech inventory",
          location: "N/A - Missing logic",
          problem: "When tech replaces a spare, the old defective spare is never inventoried",
          impact: "Defective inventory is never tracked at technician level",
          detail: "spare_inventory.qty_defective exists but no code updates it for tech",
          fix: "ADD: Logic to track defective spares when call is marked resolved"
        },
        {
          code: "DEF-002",
          severity: "MEDIUM",
          issue: "No validation that tech has qty_defective before return",
          location: "technician-spare-returns.js verify endpoint",
          problem: "Verification doesn't check if tech actually has the defective qty",
          impact: "Tech could return more defectives than they actually have",
          fix: "ADD: Qty validation before updating inventory during verification"
        }
      ],
      recommendation: "Implement defective spare tracking in tech inventory"
    },
    
    step6: {
      name: "Tech returns excess + defective to ASC (TechnicianSpareReturn)",
      description: "Tech submits return request with both unused and defective items",
      implementation: "✅ MOSTLY WORKING",
      issues: [
        {
          code: "TSR-001",
          severity: "MEDIUM",
          issue: "Return request doesn't validate available inventory",
          location: "technician-spare-returns.js create endpoint line 150",
          problem: "No check if tech has requested qty of spares (good or defective)",
          impact: "Tech can request to return more spares than they have",
          fix: "ADD: Validation against spare_inventory for both qty_good and qty_defective"
        },
        {
          code: "TSR-002",
          severity: "LOW",
          issue: "Return status transitions could be clearer",
          location: "TechnicianSpareReturn.js",
          problem: "Statuses are: draft → submitted → received → verified. Missing 'approved' state?",
          impact: "Unclear when funds are credited back",
          fix: "CLARIFY: Should there be an 'approved' status between verified and completed?"
        }
      ],
      recommendation: "Add inventory validation when creating return requests"
    },
    
    step7: {
      name: "ASC verifies return - Final inventory update",
      description: "ASC approves return, inventory transfers back (Tech ↓, ASC ↑)",
      implementation: "⚠️  WORKING BUT INCOMPLETE",
      issues: [
        {
          code: "VER-001",
          severity: "HIGH",
          issue: "Verify endpoint doesn't create stock movements",
          location: "technician-spare-returns.js verify endpoint line 575",
          problem: "Inventory is updated but no stock movement records created",
          impact: "Cannot audit the return flow, no SAP posting records",
          fix: "ADD: Stock movement creation for TECH_RETURN_DEFECTIVE when verifying returns"
        },
        {
          code: "VER-002",
          severity: "MEDIUM",
          issue: "Verify endpoint doesn't validate received quantities match",
          location: "technician-spare-returns.js verify endpoint",
          problem: "No validation that received_qty matches actual physical items",
          impact: "Inventory could be updated incorrectly if verification is wrong",
          fix: "ADD: Explicit validation/confirmation of received quantities vs expected"
        },
        {
          code: "VER-003",
          severity: "HIGH",
          issue: "Missing condition_on_receipt handling for damaged items",
          location: "TechnicianSpareReturnItem.js has field but not used",
          problem: "Items can be marked as 'damaged on receipt' but verification doesn't handle this",
          impact: "Damaged items might be counted as good, wrong inventory",
          fix: "ADD: Logic to handle damaged_on_receipt (might go to defective or be rejected)"
        },
        {
          code: "VER-004",
          severity: "MEDIUM",
          issue: "Verification happens at return level, not item level",
          location: "technician-spare-returns.js verify endpoint",
          problem: "Entire return verified together, no per-item approval/rejection",
          impact: "Cannot partially accept return (e.g., accept good but reject defective)",
          fix: "REFACTOR: Make verification item-by-item with acceptance/rejection per item"
        }
      ],
      recommendation: "Enhance verification process with stock movements and per-item handling"
    }
  },

  criticalGaps: [
    {
      gap: "Missing Allocation Endpoint",
      impact: "CRITICAL - Spares never actually allocated from ASC to Tech",
      affectedSteps: ["Step 3"],
      details: "Workflow goes: tech requests → ASC receives → ASC verifies. Missing: ASC allocates (with inventory update).",
      solution: "Create POST /api/spare-requests/{requestId}/allocate endpoint"
    },
    {
      gap: "No Defective Inventory Tracking",
      impact: "CRITICAL - Workflow cannot track defective spares",
      affectedSteps: ["Step 5", "Step 7"],
      details: "spare_inventory has qty_defective field but no code populates it for technicians",
      solution: "Add logic to update spare_inventory.qty_defective in all relevant endpoints"
    },
    {
      gap: "Stock Movements Missing",
      impact: "HIGH - Cannot audit or post to SAP",
      affectedSteps: ["Step 3", "Step 7"],
      details: "No stock movements created for TECH_ISSUE_OUT, TECH_ISSUE_IN, TECH_RETURN_DEFECTIVE",
      solution: "Add stock movement creation in allocation and verification endpoints"
    },
    {
      gap: "No Inventory Validation",
      impact: "HIGH - System allows impossible transactions",
      affectedSteps: ["Step 3", "Step 6"],
      details: "No checks if ASC has qty to allocate or if tech has qty to return",
      solution: "Add pre-transaction inventory validation"
    },
    {
      gap: "Call-Spare Usage Not Fully Integrated",
      impact: "MEDIUM - Cannot track what was used vs excess",
      affectedSteps: ["Step 4"],
      details: "call_spare_usage fields exist but unclear if properly updated with exact usage",
      solution: "Ensure tech can update usage details after replacement"
    },
    {
      gap: "No Condition Tracking on Return",
      impact: "MEDIUM - Damaged items not handled",
      affectedSteps: ["Step 7"],
      details: "TechnicianSpareReturnItem.condition_on_receipt exists but not processed",
      solution: "Add logic for condition-based inventory routing (good/defective/rejected)"
    }
  ],

  detailedRecommendations: {
    immediate: [
      {
        priority: 1,
        action: "ADD ALLOCATION ENDPOINT",
        file: "routes/spare-requests.js",
        code: `
router.post('/:requestId/allocate', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { requestId } = req.params;
    const { items, remarks } = req.body;

    // 1. Verify request exists and user is ASC admin
    const request = await sequelize.query(
      'SELECT * FROM spare_requests WHERE request_id = ?',
      { replacements: [requestId], type: QueryTypes.SELECT }
    );

    // 2. For each item:
    for (const item of items) {
      // 2a. Validate ASC has qty available
      // 2b. Create TECH_ISSUE_OUT stock movement
      // 2c. Create TECH_ISSUE_IN stock movement
      // 2d. Update spare_inventory: ASC qty_good --, Tech qty_good ++
    }

    // 3. Update spare_request status to 'allocated'
    // 4. Commit and return success
  }
});
        `
      },
      {
        priority: 2,
        action: "IMPLEMENT DEFECTIVE INVENTORY TRACKING",
        file: "routes/calls.js or technician-tracking.js",
        code: `
// When marking call as RESOLVED/COMPLETED:
// 1. Get all used spares from call_spare_usage
// 2. For each used spare:
//    - Check if it's defective (from defect_id in call_spare_usage)
//    - Update tech inventory: qty_defective += 1 (the replaced part)
//    - Example: DELETE PART A, INSTALL SPARE B → SPARE A goes to tech as defective

// Pseudocode:
for (const usage of callUsages) {
  if (usage.used_qty > 0) {
    // One defective spare from the call is now with tech
    const defectiveQty = usage.used_qty;
    
    // Update tech inventory
    UPDATE spare_inventory SET qty_defective = qty_defective + ${defectiveQty}
    WHERE location_type = 'technician' AND location_id = ${techId}
    AND spare_id = ${usage.spare_part_id}
  }
}
        `
      },
      {
        priority: 3,
        action: "ADD STOCK MOVEMENT CREATION",
        file: "routes/spare-requests.js, technician-spare-returns.js",
        code: `
// In allocation endpoint:
// 1. TECH_ISSUE_OUT movement (ASC perspective)
INSERT INTO stock_movements (
  spare_id, location_type, location_id, 
  movement_type, quantity, created_at
) VALUES (?, 'service_center', ?, 'TECH_ISSUE_OUT', ?, GETDATE())

// 2. TECH_ISSUE_IN movement (Tech perspective)
INSERT INTO stock_movements (
  spare_id, location_type, location_id, 
  movement_type, quantity, created_at
) VALUES (?, 'technician', ?, 'TECH_ISSUE_IN', ?, GETDATE())

// In verification endpoint:
// 1. TECH_RETURN_DEFECTIVE movement (for defective items)
INSERT INTO stock_movements (
  spare_id, location_type, location_id, 
  movement_type, quantity, created_at
) VALUES (?, 'technician', ?, 'TECH_RETURN_DEFECTIVE', ?, GETDATE())
        `
      }
    ],
    
    highPriority: [
      {
        action: "ADD INVENTORY VALIDATION",
        where: "In allocation and return endpoints",
        validation: `
// Before allocating from ASC:
const ascInventory = SELECT qty_good FROM spare_inventory 
  WHERE location_type='service_center' AND spare_id=? AND location_id=?
if (ascInventory.qty_good < requestedQty) throw error('Insufficient stock')

// Before accepting return from tech:
const techInventory = SELECT qty_good, qty_defective FROM spare_inventory
  WHERE location_type='technician' AND spare_id=? AND location_id=?
if (techInventory.qty_good < item.unusedQty) throw error('Tech doesn't have unused spare')
if (techInventory.qty_defective < item.defectiveQty) throw error('Tech doesn't have defective spare')
        `
      },
      {
        action: "IMPLEMENT PER-ITEM VERIFICATION",
        where: "technician-spare-returns.js verify endpoint",
        detail: "Allow accepting/rejecting items individually instead of all-or-nothing",
        code: `
// Current: Entire return verified at once
// Should be: Each item can be accepted/rejected with condition noted

// For each return item:
{
  status: 'accepted' | 'rejected' | 'partial',  
  accepted_qty: number,
  condition_noted: 'good' | 'damaged' | 'defective',
  remarks: string
}
        `
      },
      {
        action: "TRACK CONDITION ON RECEIPT",
        where: "When verifying returns",
        handling: `
// When receiving/verifying return items:
if (item.condition_on_receipt === 'damaged') {
  // Route to damage handling (maybe scrap, maybe repair)
  // Don't count as good inventory
} else if (item.condition_on_receipt === 'defective') {
  // Add to defective bucket
} else {
  // Add to good bucket
}
        `
      }
    ],

    mediumPriority: [
      {
        action: "Clarify call_spare_usage update flow",
        issue: "When does tech indicate what was actually used vs excess?",
        solution: "Add an endpoint to mark usage complete with final qty breakdown"
      },
      {
        action: "Add approval/rejection status",
        issue: "Return is 'verified' but unclear if funds are credited",
        solution: "Add 'approved' or 'completed' status after verification"
      },
      {
        action: "Document field mappings",
        issue: "Unclear relationship between spare_request_type and movement_type",
        solution: "Create reference showing TECH_ISSUE → TECH_ISSUE_OUT/IN mapping"
      }
    ]
  },

  testScenarioValidation: {
    description: "What the test file will verify",
    checklist: [
      "✅ Call created and assigned to tech",
      "✅ Tech can create spare request",
      "❌ Allocation updates inventory (missing endpoint)",
      "⚠️  Stock movements created (verify if happening)",
      "❌ Defective inventory tracked (missing logic)",
      "✅ Tech can submit return request",
      "❌ Verification updates inventory completely (stock movements missing)",
      "⚠️  Inventory validation in place (unclear)"
    ]
  },

  expectedOutcomesAfterFixes: {
    step1: "Call assigned to tech ✅",
    step2: "Request created, status='allocated' after allocation endpoint",
    step3: "Inventory updated: ASC qty_good -2, Tech qty_good +2, Stock movements created",
    step4: "call_spare_usage: issued_qty=2, used_qty=1, returned_qty=1",
    step5: "Tech inventory: qty_good -1, qty_defective +1",
    step6: "Return created with 2 items: 1 defective + 1 unused",
    step7: "Tech inventory: qty_good 0, qty_defective 0; ASC inventory: qty_good +1, qty_defective +1"
  }
};

module.exports = WORKFLOW_ANALYSIS;

/* 
SUMMARY:
The core logic is in place but there are CRITICAL gaps:

1. NO ALLOCATION ENDPOINT - Spares never actually transfer from ASC to Tech
2. NO DEFECTIVE TRACKING - Can't track defective spares at tech level
3. NO STOCK MOVEMENTS - Complete audit trail missing
4. NO VALIDATION - System allows impossible transactions

Files that need updates:
- routes/spare-requests.js (add allocation endpoint + validation)
- routes/technician-spare-returns.js (add stock movements + validation)
- routes/calls.js OR technician-tracking.js (add defective tracking)
- routes/technician-tracking.js (ensure call_spare_usage properly tracked)

Estimated timeline to fix: 2-3 hours if good understanding of codebase
*/
