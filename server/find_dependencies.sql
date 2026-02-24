-- Find what objects reference the movement_type column

PRINT '=== Finding objects that reference movement_type column ==='
PRINT ''

-- Check for computed/calculated columns
PRINT '1. Computed Columns:'
SELECT 
    c.name as computed_column_name,
    c.definition
FROM sys.computed_columns c
WHERE c.object_id = OBJECT_ID('stock_movement')

-- Check for views
PRINT ''
PRINT '2. Views referencing stock_movement table:'
SELECT DISTINCT
    OBJECT_NAME(v.object_id) as view_name,
    v.type_desc
FROM sys.sql_dependencies d
INNER JOIN sys.objects v ON d.referencing_id = v.object_id
WHERE d.referenced_object_id = OBJECT_ID('stock_movement')
AND v.type = 'V'

-- Check for stored procedures
PRINT ''
PRINT '3. Stored Procedures referencing stock_movement:'
SELECT DISTINCT
    OBJECT_NAME(p.object_id) as proc_name
FROM sys.sql_dependencies d
INNER JOIN sys.objects p ON d.referencing_id = p.object_id
WHERE d.referenced_object_id = OBJECT_ID('stock_movement')
AND p.type = 'P'

-- Check column dependencies more directly
PRINT ''
PRINT '4. Direct column usage (advanced check):'
SELECT 
    OBJECT_NAME(o.object_id) as object_name,
    o.type_desc,
    c.name as column_name
FROM sys.columns c
INNER JOIN sys.objects o ON c.object_id = o.object_id
WHERE o.name = 'stock_movement'
AND c.name = 'movement_type'

-- Check for default constraints (which would show up as using the column)
PRINT ''
PRINT '5. Any constraints on movement_type column:'
SELECT
    dc.name as constraint_name,
    dc.definition
FROM sys.default_constraints dc
INNER JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE c.object_id = OBJECT_ID('stock_movement')
AND c.name = 'movement_type'

PRINT ''
PRINT '=== END ==='
