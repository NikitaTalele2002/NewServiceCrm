import { sequelize } from './database/connection.js';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Starting database migration to drop CustomerCode unique constraint...');
    
    const migrationSql = `
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
        PRINT 'Constraint UQ__Customer__0667852100720049 not found, checking for other unique constraints...';
    END
    
    -- Also ensure MobileNo is the only unique constraint
    -- Check if there are any other unique constraints on non-MobileNo fields
    DECLARE @TableName NVARCHAR(128) = 'Customers';
    DECLARE @ConstraintName NVARCHAR(128);
    DECLARE @ColumnName NVARCHAR(128);
    
    DECLARE constraint_cursor CURSOR FOR
    SELECT constraint_name = c.name, column_name = col.name
    FROM sys.key_constraints k
    INNER JOIN sys.index_columns ic ON k.unique_index_id = ic.index_id
    INNER JOIN sys.columns col ON ic.object_id = col.object_id AND ic.column_id = col.column_id
    WHERE k.parent_object_id = OBJECT_ID(@TableName) AND k.type = 'UQ'
    AND col.name NOT IN ('MobileNo');
    
    OPEN constraint_cursor;
    FETCH NEXT FROM constraint_cursor INTO @ConstraintName, @ColumnName;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC ('ALTER TABLE Customers DROP CONSTRAINT ' + @ConstraintName);
        PRINT 'Dropped unnecessary unique constraint: ' + @ConstraintName + ' on column: ' + @ColumnName;
        FETCH NEXT FROM constraint_cursor INTO @ConstraintName, @ColumnName;
    END
    
    CLOSE constraint_cursor;
    DEALLOCATE constraint_cursor;
    `;
    
    const result = await sequelize.query(migrationSql);
    console.log('✅ Migration completed successfully!');
    console.log('Result:', result);
    
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await sequelize.close();
  }
}

runMigration();
