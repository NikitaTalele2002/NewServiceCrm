-- Migration: Rename branch to plant (with constraint handling)

PRINT '=== Migration: Rename branch to plant ===';
PRINT '';

-- Step 1: Drop the CHECK constraint on roles table
PRINT '1️⃣  Dropping CHECK constraint on roles table...';
ALTER TABLE roles DROP CONSTRAINT CK__roles__roles_nam__53A7F60D;
PRINT '✅ CHECK constraint dropped';
PRINT '';

-- Step 2: Update roles table - rename 'branch' role to 'plant'
PRINT '2️⃣  Updating roles table...';
UPDATE roles 
SET roles_name = 'plant' 
WHERE roles_name = 'branch';
PRINT '✅ Roles table updated (branch -> plant)';
PRINT '';

-- Step 3: Recreate the CHECK constraint with 'plant' instead of 'branch'
PRINT '3️⃣  Recreating CHECK constraint...';
ALTER TABLE roles ADD CONSTRAINT CK__roles__roles_nam__53A7F60D 
CHECK ([roles_name] IN ('RSM', 'call_center', 'plant', 'service_center', 'customer', 'technician', 'HOD', 'admin'));
PRINT '✅ CHECK constraint recreated with plant';
PRINT '';

-- Step 4: Check if there's a constraint on spare_inventory location_type
PRINT '4️⃣  Updating spare_inventory location_type...';
SELECT TOP 1 name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('spare_inventory');

-- Drop the constraint if it exists
DECLARE @ConstraintName NVARCHAR(128);
SELECT TOP 1 @ConstraintName = name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('spare_inventory');

IF @ConstraintName IS NOT NULL
BEGIN
  PRINT '   Dropping constraint: ' + @ConstraintName;
  EXEC('ALTER TABLE spare_inventory DROP CONSTRAINT ' + @ConstraintName);
END;

-- Update the location_type values
UPDATE spare_inventory 
SET location_type = 'plant' 
WHERE location_type = 'branch';
PRINT '✅ spare_inventory updated (branch -> plant)';
PRINT '';

-- Recreate the constraint if needed
ALTER TABLE spare_inventory ADD CONSTRAINT CK__spare_inv__locat__04E02A45 
CHECK ([location_type] IN ('warehouse', 'plant', 'service_center', 'technician', 'customer', 'supplier'));
PRINT '✅ spare_inventory CHECK constraint recreated';
PRINT '';

-- Step 5: Update spare_requests table
PRINT '5️⃣  Updating spare_requests table...';
UPDATE spare_requests
SET requested_to_type = 'plant'
WHERE requested_to_type = 'branch';
PRINT '✅ spare_requests requested_to_type updated';
PRINT '';

-- Step 6: Update stock_movement table
PRINT '6️⃣  Updating stock_movement table...';
UPDATE stock_movement
SET source_location_type = 'plant'
WHERE source_location_type = 'branch';

UPDATE stock_movement
SET destination_location_type = 'plant'
WHERE destination_location_type = 'branch';
PRINT '✅ stock_movement location types updated';
PRINT '';

-- Verify
PRINT '7️⃣  Verification:';
PRINT '';
PRINT 'Roles table:';
SELECT roles_id, roles_name FROM roles WHERE roles_name = 'plant';
PRINT '';
PRINT 'Spare inventory locations:';
SELECT DISTINCT location_type FROM spare_inventory ORDER BY location_type;
PRINT '';

PRINT '✅ Migration Complete!';
