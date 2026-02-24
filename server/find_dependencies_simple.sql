-- Simpler diagnostic: find computed columns in stock_movement table

PRINT '=== Checking stock_movement table structure ==='
PRINT ''

-- List all columns with their properties
SELECT 
    COLUMN_ID,
    NAME,
    system_type_id,
    is_computed,
    is_identity
FROM sys.columns
WHERE object_id = OBJECT_ID('stock_movement')
ORDER BY COLUMN_ID

PRINT ''
PRINT '=== Computed Columns (if any) ==='

SELECT 
    c.name as column_name,
    cc.definition
FROM sys.computed_columns cc
INNER JOIN sys.columns c ON cc.object_id = c.object_id AND cc.column_id = c.column_id
WHERE cc.object_id = OBJECT_ID('stock_movement')

PRINT ''
PRINT '=== Schema for movement_type column ==='

SELECT *
FROM sys.columns
WHERE object_id = OBJECT_ID('stock_movement')
AND name = 'movement_type'

PRINT ''
PRINT '=== Indexes on stock_movement table ==='

SELECT
    i.name as index_name,
    i.type_desc,
    STRING_AGG(c.name, ', ') as column_names
FROM sys.indexes i
LEFT JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
LEFT JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE i.object_id = OBJECT_ID('stock_movement')
GROUP BY i.name, i.type_desc
ORDER BY i.name
