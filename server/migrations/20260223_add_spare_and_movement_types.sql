-- Migration: Add Spare Request Types and Stock Movement Types
-- Date: 2026-02-23
-- Description: Implements the new business intent and physical reality enums
--
-- 1. Spare Request Types (WHY material is moving)
--    - CFU: Consignment Fill-Up
--    - TECH_ISSUE: Technician Issue
--    - TECH_RETURN_DEFECTIVE: Technician Return Defective
--    - ASC_RETURN_DEFECTIVE: ASC Return Defective
--    - ASC_RETURN_EXCESS: ASC Return Excess
--    - BRANCH_PICKUP: Consignment Pick-Up
--
-- 2. Stock Movement Types (WHAT happened to stock)
--    - FILLUP_DISPATCH, FILLUP_RECEIPT
--    - TECH_ISSUE_OUT, TECH_ISSUE_IN
--    - TECH_RETURN_DEFECTIVE
--    - ASC_RETURN_DEFECTIVE_OUT, ASC_RETURN_DEFECTIVE_IN
--    - CONSUMPTION_IW, CONSUMPTION_OOW

-- Step 1: Add spare_request_type column to spare_requests table
ALTER TABLE spare_requests
ADD spare_request_type NVARCHAR(50) NULL,
ADD CONSTRAINT chk_spare_request_type 
  CHECK (spare_request_type IN (
    'CFU',
    'TECH_ISSUE',
    'TECH_RETURN_DEFECTIVE',
    'ASC_RETURN_DEFECTIVE',
    'ASC_RETURN_EXCESS',
    'BRANCH_PICKUP'
  ));

-- Step 2: Add stock_movement_type column to stock_movement table
ALTER TABLE stock_movement
ADD stock_movement_type NVARCHAR(50) NULL,
ADD bucket_impact NVARCHAR(50) NULL,
ADD sap_integration BIT DEFAULT 0,
ADD sap_process NVARCHAR(100) NULL,
ADD CONSTRAINT chk_stock_movement_type 
  CHECK (stock_movement_type IN (
    'FILLUP_DISPATCH',
    'FILLUP_RECEIPT',
    'TECH_ISSUE_OUT',
    'TECH_ISSUE_IN',
    'TECH_RETURN_DEFECTIVE',
    'ASC_RETURN_DEFECTIVE_OUT',
    'ASC_RETURN_DEFECTIVE_IN',
    'CONSUMPTION_IW',
    'CONSUMPTION_OOW'
  )),
ADD CONSTRAINT chk_bucket_impact 
  CHECK (bucket_impact IN (
    'Good',
    'Good-Decrease',
    'Defective',
    'In-Transit'
  )),
ADD CONSTRAINT chk_sap_process 
  CHECK (sap_process IN (
    'SO → DN → PGI',
    'CR → Return Delivery → PGR → CN',
    'Internal CRM',
    'Bucket shift only',
    'Warranty tracking'
  ));

-- Step 3: Add index on new columns for performance
CREATE INDEX idx_spare_request_type ON spare_requests(spare_request_type);
CREATE INDEX idx_stock_movement_type ON stock_movement(stock_movement_type);
CREATE INDEX idx_bucket_impact ON stock_movement(bucket_impact);

-- Migration complete
PRINT 'Migration: Spare Request Types and Stock Movement Types - COMPLETED'
