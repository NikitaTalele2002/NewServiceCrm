/*
  Safe rename migration: rename Cities.Parent_I -> PARENT_ID
  Use in SSMS after taking a full backup. This script will only run the rename
  if the old column exists and the new column does not.

  IMPORTANT:
  - Renaming a column does NOT automatically rename constraints or indexes that embed the column name.
    After running this, check constraints/indexes that reference the old column name and update them if necessary.
  - Test in a staging environment first.
*/

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Cities') AND name = 'Parent_I')
AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Cities') AND name = 'PARENT_ID')
BEGIN
  PRINT 'Renaming dbo.Cities.Parent_I -> PARENT_ID';
  EXEC sp_rename 'dbo.Cities.Parent_I', 'PARENT_ID', 'COLUMN';
  PRINT 'Rename complete.';
END
ELSE IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Cities') AND name = 'Parent_I')
BEGIN
  PRINT 'Column dbo.Cities.Parent_I does not exist; nothing to rename.';
END
ELSE
BEGIN
  PRINT 'Target column dbo.Cities.PARENT_ID already exists; rename skipped.';
END
