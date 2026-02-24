-- Find table names and constraints

PRINT '=== Finding Table Names and Constraints ===';
PRINT '';

-- Find exact table names
PRINT 'Tables containing "spare":';
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME LIKE '%spare%'
ORDER BY TABLE_NAME;

PRINT '';
PRINT 'CHECK constraints on roles table:';
SELECT CONSTRAINT_NAME, DEFINITION FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('roles');

PRINT '';
PRINT 'CHECK constraints on spare_inventory table:';
SELECT CONSTRAINT_NAME, DEFINITION FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('spare_inventory');

PRINT '';
PRINT 'Available location types in spare_inventory NOW:';
SELECT DISTINCT location_type FROM spare_inventory ORDER BY location_type;
