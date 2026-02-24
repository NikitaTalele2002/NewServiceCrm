-- Simple direct approach

PRINT 'Dropping all CHECK constraints from spare_requests and stock_movement...';

DECLARE @SQL NVARCHAR(MAX) = '';

-- Build dynamic SQL to drop all constraints
SELECT @SQL = @SQL + 'ALTER TABLE ' + TABLE_NAME + ' DROP CONSTRAINT ' + CONSTRAINT_NAME + '; '
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE CONSTRAINT_TYPE = 'CHECK'
AND TABLE_NAME IN ('spare_requests', 'stock_movement');

PRINT @SQL;
EXEC sp_executesql @SQL;

PRINT 'Constraints dropped';

-- Now update all values
PRINT '';
PRINT 'Updating spare_requests...';
UPDATE spare_requests SET requested_to_type = 'plant' WHERE requested_to_type = 'branch';

PRINT 'Updating stock_movement source...';
UPDATE stock_movement SET source_location_type = 'plant' WHERE source_location_type = 'branch';

PRINT 'Updating stock_movement destination...';
UPDATE stock_movement SET destination_location_type = 'plant' WHERE destination_location_type = 'branch';

PRINT '';
PRINT '✅ Complete!';
