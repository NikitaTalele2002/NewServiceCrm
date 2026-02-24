-- Simpler check constraint query

PRINT '=== Check Constraints on stock_movement table ==='
PRINT ''

SELECT
    name as constraint_name,
    definition
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('stock_movement')

PRINT ''
PRINT '=== All primary/foreign/unique keys ==='
PRINT ''

SELECT
    i.name as key_name,
    i.type_desc,
    STUFF((
        SELECT ', ' + c.name
        FROM sys.index_columns ic
        INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id
        FOR XML PATH('')
    ), 1, 2, '') as columns
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID('stock_movement')
AND i.is_unique = 1
ORDER BY i.name
