-- SQL Script: Drop movement_type column from stock_movement table
-- Date: 2026-02-23

PRINT '=== Dropping movement_type column from stock_movement table ==='
PRINT ''

-- Check if column exists
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'stock_movement' 
    AND COLUMN_NAME = 'movement_type'
)
BEGIN
    PRINT 'Column found. Attempting to drop...'
    PRINT ''
    
    BEGIN TRY
        ALTER TABLE stock_movement DROP COLUMN movement_type;
        PRINT 'SUCCESS: Column movement_type dropped successfully!'
        PRINT ''
    END TRY
    BEGIN CATCH
        PRINT 'ERROR: Failed to drop column'
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS VARCHAR(5))
        PRINT 'Error Message: ' + ERROR_MESSAGE()
    END CATCH
END
ELSE
BEGIN
    PRINT 'Column does not exist - already removed!'
    PRINT ''
END

-- Verify
PRINT 'Verifying removal...'
PRINT ''

SELECT 
    COLUMN_NAME, 
    DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'stock_movement'
AND COLUMN_NAME LIKE '%movement%'  
ORDER BY ORDINAL_POSITION

PRINT ''
PRINT '=== Complete ==='
