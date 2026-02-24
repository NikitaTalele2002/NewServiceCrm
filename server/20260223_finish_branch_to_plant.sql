-- Handle remaining constraints

PRINT '=== Handling spare_requests and stock_movement constraints ===';
PRINT '';

-- Drop constraints from spare_requests
PRINT '1️⃣  Updating spare_requests with constraint handling...';
DECLARE @ConstraintName NVARCHAR(128);
SELECT TOP 1 @ConstraintName = name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('spare_requests');
IF @ConstraintName IS NOT NULL
BEGIN
  PRINT '   Dropping constraint: ' + @ConstraintName;
  EXEC('ALTER TABLE spare_requests DROP CONSTRAINT ' + @ConstraintName);
END;

UPDATE spare_requests
SET requested_to_type = 'plant'
WHERE requested_to_type = 'branch';
PRINT '✅ spare_requests updated';
PRINT '';

-- Recreate constraint for spare_requests with 'plant'
ALTER TABLE spare_requests ADD CONSTRAINT CK__spare_req__reque__7A629BD2
CHECK ([requested_to_type] IN ('warehouse', 'plant', 'service_center', 'technician', 'customer', 'supplier'));
PRINT '✅ spare_requests constraint recreated';
PRINT '';

-- Handle stock_movement constraints
PRINT '2️⃣  Updating stock_movement with constraint handling...';

DECLARE @sc1 NVARCHAR(128);
SELECT TOP 1 @sc1 = name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('stock_movement') AND definition LIKE '%source_location_type%';
IF @sc1 IS NOT NULL
BEGIN
  PRINT '   Dropping constraint: ' + @sc1;
  EXEC('ALTER TABLE stock_movement DROP CONSTRAINT ' + @sc1);
END;

DECLARE @sc2 NVARCHAR(128);
SELECT TOP 1 @sc2 = name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('stock_movement') AND definition LIKE '%destination_location_type%';
IF @sc2 IS NOT NULL
BEGIN
  PRINT '   Dropping constraint: ' + @sc2;
  EXEC('ALTER TABLE stock_movement DROP CONSTRAINT ' + @sc2);
END;

UPDATE stock_movement
SET source_location_type = 'plant'
WHERE source_location_type = 'branch';

UPDATE stock_movement
SET destination_location_type = 'plant'
WHERE destination_location_type = 'branch';
PRINT '✅ stock_movement updated';
PRINT '';

-- Recreate constraints
ALTER TABLE stock_movement ADD CONSTRAINT CK__stock_mov__sourc__32E620C0
CHECK ([source_location_type] IN ('warehouse', 'plant', 'service_center', 'technician', 'customer', 'supplier'));

ALTER TABLE stock_movement ADD CONSTRAINT CK__stock_mov__desti__33DA44F9
CHECK ([destination_location_type] IN ('warehouse', 'plant', 'service_center', 'technician', 'customer', 'supplier'));
PRINT '✅ stock_movement constraints recreated';
PRINT '';

PRINT '✅ All constraints handled!';
PRINT '';

PRINT 'Final verification:';
SELECT DISTINCT location_type FROM spare_inventory WHERE location_type IN ('branch', 'plant');
SELECT DISTINCT requested_to_type FROM spare_requests WHERE requested_to_type IN ('branch', 'plant');
SELECT DISTINCT source_location_type FROM stock_movement WHERE source_location_type IN ('branch', 'plant');
SELECT DISTINCT destination_location_type FROM stock_movement WHERE destination_location_type IN ('branch', 'plant');
