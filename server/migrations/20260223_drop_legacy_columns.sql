-- Migration: Drop legacy request_type column
-- Date: 2026-02-23
-- Description: Remove legacy request_type column from spare_requests table
--              Now using spare_request_type exclusively

-- Step 1: Drop the request_type column from spare_requests
ALTER TABLE spare_requests
DROP COLUMN request_type;

-- Step 2: Drop the movement_type column from stock_movement
ALTER TABLE stock_movement
DROP COLUMN movement_type;

-- Migration complete
PRINT 'Migration: Drop legacy request_type and movement_type columns - COMPLETED'
