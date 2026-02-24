-- Check for CHECK constraints that might reference movement_type

PRINT '=== Check Constraints on stock_movement table ==='
PRINT ''

SELECT
    c.name as constraint_name,
    c.definition,
    c.type
FROM sys.check_constraints c
WHERE c.parent_object_id = OBJECT_ID('stock_movement')
ORDER BY c.name

PRINT ''
PRINT '=== All Constraints on stock_movement table ==='
PRINT ''

SELECT
    CONSTRAINT_NAME,
    CONSTRAINT_TYPE,
    TABLE_NAME,
    COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'stock_movement'

PRINT ''
PRINT '=== Table Constraints Detail ==='
PRINT ''

SELECT
    CONSTRAINT_NAME,
    CONSTRAINT_TYPE
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_NAME = 'stock_movement'
ORDER BY CONSTRAINT_NAME
