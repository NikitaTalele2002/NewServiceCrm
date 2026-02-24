-- Migration: Update roles table and location_type from 'branch' to 'plant'

PRINT '=== Migration: Rename branch to plant ===';
PRINT '';

-- Step 1: Update roles table - rename 'branch' role to 'plant'
PRINT '1️⃣  Updating roles table...';
UPDATE roles 
SET roles_name = 'plant' 
WHERE roles_name = 'branch';
PRINT '✅ Roles table updated (branch -> plant)';
PRINT '';

-- Step 2: Update spare_inventory table - location_type 'branch' to 'plant'
PRINT '2️⃣  Updating spare_inventory location_type...';
UPDATE spare_inventory 
SET location_type = 'plant' 
WHERE location_type = 'branch';
PRINT '✅ spare_inventory updated (branch -> plant)';
PRINT '';

-- Step 3: Update spare_request table - location types 'branch' to 'plant'
PRINT '3️⃣  Updating spare_request table...';
UPDATE spare_request
SET requested_to_type = 'plant'
WHERE requested_to_type = 'branch';
PRINT '✅ spare_request requested_to_type updated (branch -> plant)';
PRINT '';

-- Step 4: Update stock_movement table - location types
PRINT '4️⃣  Updating stock_movement table...';
UPDATE stock_movement
SET source_location_type = 'plant'
WHERE source_location_type = 'branch';

UPDATE stock_movement
SET destination_location_type = 'plant'
WHERE destination_location_type = 'branch';
PRINT '✅ stock_movement location types updated (branch -> plant)';
PRINT '';

-- Verify changes
PRINT '5️⃣  Verification:';
PRINT '';

PRINT '   Roles with "plant":';
SELECT roles_id, roles_name FROM roles WHERE roles_name = 'plant';
PRINT '';

PRINT '   Spare inventory locations:';
SELECT DISTINCT location_type FROM spare_inventory ORDER BY location_type;
PRINT '';

PRINT '✅ Migration Complete';
