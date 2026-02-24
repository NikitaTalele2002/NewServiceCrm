-- Drop all constraints and update

PRINT '=== Comprehensive constraint handling ===';
PRINT '';

-- Find and drop ALL CHECK constraints on these tables
DECLARE @TableName NVARCHAR(MAX);
DECLARE @ConstraintName NVARCHAR(MAX);

DECLARE cursorConstraints CURSOR FOR
SELECT name FROM sys.check_constraints WHERE parent_object_id IN (OBJECT_ID('spare_requests'), OBJECT_ID('stock_movement'));

OPEN cursorConstraints;
FETCH NEXT FROM cursorConstraints INTO @ConstraintName;

WHILE @@FETCH_STATUS = 0
BEGIN
  PRINT 'Dropping constraint: ' + @ConstraintName;
  EXEC('ALTER TABLE ' + PARSENAME(OBJECT_NAME(parent_object_id, DB_ID()), 1) + ' DROP CONSTRAINT ' + @ConstraintName);
  FETCH NEXT FROM cursorConstraints INTO @ConstraintName;
END;

CLOSE cursorConstraints;
DEALLOCATE cursorConstraints;

PRINT '✅ All constraints dropped';
PRINT '';

-- Now update the tables
PRINT 'Updating spare_requests...';
UPDATE spare_requests
SET requested_to_type = 'plant'
WHERE requested_to_type = 'branch';
PRINT 'Done';

PRINT 'Updating stock_movement...';
UPDATE stock_movement
SET source_location_type = 'plant'
WHERE source_location_type = 'branch';

UPDATE stock_movement
SET destination_location_type = 'plant'
WHERE destination_location_type = 'branch';
PRINT 'Done';

PRINT '';
PRINT '✅ All updates complete!';
PRINT '';

-- Verify
SELECT DISTINCT requested_to_type FROM spare_requests WHERE requested_to_type IN ('branch', 'plant');
SELECT DISTINCT source_location_type FROM stock_movement WHERE source_location_type IN ('branch', 'plant');
SELECT DISTINCT destination_location_type FROM stock_movement WHERE destination_location_type IN ('branch', 'plant');
