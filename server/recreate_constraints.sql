-- Recreate CHECK constraints with updated location_type values (branch -> plant)
-- Only recreating stock_movement constraints (spare_requests constraints already exist)

-- Re-create stock_movement table CHECK constraints (3 total)
-- Constraint 1: reference_type
ALTER TABLE [stock_movement] ADD CONSTRAINT [CK__stock_mov__refer__31F1FC87]
  CHECK ([reference_type] IN ('purchase', 'transfer', 'return_request', 'consignment', 'adjustment', 'sale', 'spare_request'));

-- Constraint 2: source_location_type
ALTER TABLE [stock_movement] ADD CONSTRAINT [CK__stock_mov__sourc__32E620C0]
  CHECK ([source_location_type] IN ('warehouse', 'plant', 'service_center', 'technician', 'customer', 'supplier'));

-- Constraint 3: destination_location_type
ALTER TABLE [stock_movement] ADD CONSTRAINT [CK__stock_mov__desti__33DA44F9]
  CHECK ([destination_location_type] IN ('warehouse', 'plant', 'service_center', 'technician', 'customer', 'supplier'));

PRINT 'Successfully created 3 CHECK constraints on stock_movement with updated location_type values (plant instead of branch)';



