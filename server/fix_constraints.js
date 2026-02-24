import sequelize from './database/connection.js';

async function fixConstraint() {
  try {
    console.log('🔍 Checking for unique constraints on Customers table...\n');
    
    // First, let's see what constraints exist
    const checkSql = `
    SELECT 
        c.name as constraint_name,
        col.name as column_name,
        t.name as table_name,
        c.type as constraint_type
    FROM sys.key_constraints c
    INNER JOIN sys.index_columns ic ON c.unique_index_id = ic.index_id AND ic.object_id = c.parent_object_id
    INNER JOIN sys.columns col ON ic.object_id = col.object_id AND ic.column_id = col.column_id
    INNER JOIN sys.tables t ON c.parent_object_id = t.object_id
    WHERE t.name = 'Customers' AND c.type = 'UQ'
    `;
    
    const constraints = await sequelize.query(checkSql, { type: sequelize.QueryTypes.SELECT });
    console.log('Current unique constraints:');
    console.table(constraints);
    
    // Now drop any constraint that's not on MobileNo
    const dropSql = `
    DECLARE @TableName NVARCHAR(128) = 'Customers';
    
    DECLARE @ConstraintName NVARCHAR(128);
    DECLARE @ColumnName NVARCHAR(128);
    
    DECLARE constraint_cursor CURSOR FOR
    SELECT c.name, col.name
    FROM sys.key_constraints c
    INNER JOIN sys.index_columns ic ON c.unique_index_id = ic.index_id
    INNER JOIN sys.columns col ON ic.object_id = col.object_id AND ic.column_id = col.column_id
    WHERE c.parent_object_id = OBJECT_ID(@TableName) 
    AND c.type = 'UQ'
    AND col.name NOT IN ('MobileNo');
    
    OPEN constraint_cursor;
    FETCH NEXT FROM constraint_cursor INTO @ConstraintName, @ColumnName;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRY
            EXEC ('ALTER TABLE Customers DROP CONSTRAINT [' + @ConstraintName + ']');
            PRINT '✅ Dropped constraint: ' + @ConstraintName + ' (column: ' + @ColumnName + ')';
        END TRY
        BEGIN CATCH
            PRINT '❌ Failed to drop ' + @ConstraintName + ': ' + ERROR_MESSAGE();
        END CATCH
        FETCH NEXT FROM constraint_cursor INTO @ConstraintName, @ColumnName;
    END
    
    CLOSE constraint_cursor;
    DEALLOCATE constraint_cursor;
    `;
    
    const result = await sequelize.query(dropSql);
    console.log('\n✅ Constraint cleanup completed!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

fixConstraint();
