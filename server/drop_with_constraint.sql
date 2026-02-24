-- Drop the CHECK constraint, then drop the column

PRINT '=== Removing movement_type column (with constraint cleanup) ==='
PRINT ''

-- Step 1: Drop the CHECK constraint that references the column
PRINT 'Step 1: Dropping CHECK constraint on movement_type...'
BEGIN TRY
    ALTER TABLE stock_movement DROP CONSTRAINT CK__stock_mov__movem__30FDD84E;
    PRINT '✅ CHECK constraint dropped'
END TRY
BEGIN CATCH
    PRINT '❌ Error dropping constraint: ' + ERROR_MESSAGE()
END CATCH

PRINT ''

-- Step 2: Drop the column
PRINT 'Step 2: Dropping movement_type column...'
BEGIN TRY
    ALTER TABLE stock_movement DROP COLUMN movement_type;
    PRINT '✅ Column dropped successfully'
END TRY
BEGIN CATCH
    PRINT '❌ Error dropping column: ' + ERROR_MESSAGE()
END CATCH

PRINT ''

-- Verify
PRINT 'Step 3: Verifying removal...'
PRINT ''

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_NAME = 'stock_movement' 
           AND COLUMN_NAME = 'movement_type')
BEGIN
    PRINT '❌ Column still exists!'
END
ELSE
BEGIN
    PRINT '✅ Column successfully removed'
    PRINT ''
    PRINT 'Remaining movement-type columns:'
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'stock_movement'
    AND COLUMN_NAME LIKE '%movement%'
    ORDER BY ORDINAL_POSITION
END

PRINT ''
PRINT '=== Complete ==='
