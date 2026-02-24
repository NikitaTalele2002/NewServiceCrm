-- Drop the unique constraint on CustomerCode if it exists
-- This constraint was causing 409 conflicts when creating customers with NULL CustomerCode values

IF OBJECT_ID('UQ__Customer__0667852100720049', 'UQ') IS NOT NULL
BEGIN
    ALTER TABLE Customers
    DROP CONSTRAINT UQ__Customer__0667852100720049;
    PRINT 'Constraint UQ__Customer__0667852100720049 dropped successfully';
END
ELSE
BEGIN
    -- Try to find and drop any unique constraint on CustomerCode
    DECLARE @constraint_name NVARCHAR(128);
    
    SELECT @constraint_name = name
    FROM sys.key_constraints
    WHERE parent_object_id = OBJECT_ID('Customers')
    AND type = 'UQ'
    AND OBJECT_NAME(unique_index_id) IN (
        SELECT name FROM sys.indexes 
        WHERE object_id = OBJECT_ID('Customers')
        AND type = 2
        AND is_unique = 1
    );
    
    IF @constraint_name IS NOT NULL
    BEGIN
        EXEC ('ALTER TABLE Customers DROP CONSTRAINT ' + @constraint_name);
        PRINT 'Dropped constraint: ' + @constraint_name;
    END
    ELSE
    BEGIN
        PRINT 'No unique constraint found on Customers table for CustomerCode';
    END
END
