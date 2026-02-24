-- Add missing columns to SpareParts table
DECLARE @TableName NVARCHAR(128);

-- Check if table exists with different case variations (try SpareParts first)
SELECT TOP 1 @TableName = TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN ('SpareParts', 'spare_parts', 'SPARE_PARTS')
AND TABLE_SCHEMA = 'dbo'
ORDER BY CASE WHEN TABLE_NAME = 'SpareParts' THEN 0 ELSE 1 END;

IF @TableName IS NULL
BEGIN
    PRINT '❌ SpareParts table not found';
END
ELSE
BEGIN
    PRINT '✅ Found table: ' + @TableName;
    
    -- Build and execute dynamic SQL to add columns
    DECLARE @SQL NVARCHAR(MAX) = '';
    
    -- DESCRIPTION
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @TableName AND COLUMN_NAME = 'DESCRIPTION')
    BEGIN
        SET @SQL = 'ALTER TABLE [dbo].[' + @TableName + '] ADD [DESCRIPTION] VARCHAR(255) NULL;';
        EXEC sp_executesql @SQL;
        PRINT '✓ Added DESCRIPTION column';
    END
    ELSE
    BEGIN
        PRINT '• DESCRIPTION column already exists';
    END
    
    -- MAPPED_MODEL
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @TableName AND COLUMN_NAME = 'MAPPED_MODEL')
    BEGIN
        SET @SQL = 'ALTER TABLE [dbo].[' + @TableName + '] ADD [MAPPED_MODEL] VARCHAR(50) NULL;';
        EXEC sp_executesql @SQL;
        PRINT '✓ Added MAPPED_MODEL column';
    END
    ELSE
    BEGIN
        PRINT '• MAPPED_MODEL column already exists';
    END
    
    -- MODEL_DESCRIPTION
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @TableName AND COLUMN_NAME = 'MODEL_DESCRIPTION')
    BEGIN
        SET @SQL = 'ALTER TABLE [dbo].[' + @TableName + '] ADD [MODEL_DESCRIPTION] VARCHAR(255) NULL;';
        EXEC sp_executesql @SQL;
        PRINT '✓ Added MODEL_DESCRIPTION column';
    END
    ELSE
    BEGIN
        PRINT '• MODEL_DESCRIPTION column already exists';
    END
    
    -- MAX_USED_QTY
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @TableName AND COLUMN_NAME = 'MAX_USED_QTY')
    BEGIN
        SET @SQL = 'ALTER TABLE [dbo].[' + @TableName + '] ADD [MAX_USED_QTY] INT NULL;';
        EXEC sp_executesql @SQL;
        PRINT '✓ Added MAX_USED_QTY column';
    END
    ELSE
    BEGIN
        PRINT '• MAX_USED_QTY column already exists';
    END
    
    -- SERVICE_LEVEL
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @TableName AND COLUMN_NAME = 'SERVICE_LEVEL')
    BEGIN
        SET @SQL = 'ALTER TABLE [dbo].[' + @TableName + '] ADD [SERVICE_LEVEL] VARCHAR(50) NULL;';
        EXEC sp_executesql @SQL;
        PRINT '✓ Added SERVICE_LEVEL column';
    END
    ELSE
    BEGIN
        PRINT '• SERVICE_LEVEL column already exists';
    END
    
    -- PART_LOCATION
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @TableName AND COLUMN_NAME = 'PART_LOCATION')
    BEGIN
        SET @SQL = 'ALTER TABLE [dbo].[' + @TableName + '] ADD [PART_LOCATION] VARCHAR(100) NULL;';
        EXEC sp_executesql @SQL;
        PRINT '✓ Added PART_LOCATION column';
    END
    ELSE
    BEGIN
        PRINT '• PART_LOCATION column already exists';
    END
    
    -- STATUS
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @TableName AND COLUMN_NAME = 'STATUS')
    BEGIN
        SET @SQL = 'ALTER TABLE [dbo].[' + @TableName + '] ADD [STATUS] VARCHAR(50) NULL;';
        EXEC sp_executesql @SQL;
        PRINT '✓ Added STATUS column';
    END
    ELSE
    BEGIN
        PRINT '• STATUS column already exists';
    END
    
    -- LAST_UPDATED_DATE
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @TableName AND COLUMN_NAME = 'LAST_UPDATED_DATE')
    BEGIN
        SET @SQL = 'ALTER TABLE [dbo].[' + @TableName + '] ADD [LAST_UPDATED_DATE] DATETIME NULL;';
        EXEC sp_executesql @SQL;
        PRINT '✓ Added LAST_UPDATED_DATE column';
    END
    ELSE
    BEGIN
        PRINT '• LAST_UPDATED_DATE column already exists';
    END
    
    PRINT '✅ Migration completed for table: ' + @TableName;
END
