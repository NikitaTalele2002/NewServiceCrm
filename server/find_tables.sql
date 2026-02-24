-- Simpler query for constraints

-- Find exact table names
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME LIKE '%spare%'
ORDER BY TABLE_NAME;

GO

-- Find CHECK constraints
SELECT name, definition FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('roles');

GO

-- Check what's in roles
SELECT roles_id, roles_name FROM roles WHERE roles_name IN ('branch', 'plant');
