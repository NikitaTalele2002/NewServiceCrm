-- Add BranchId column to ServiceCenters table (if not exists)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServiceCenters' AND COLUMN_NAME = 'BranchId')
BEGIN
  ALTER TABLE ServiceCenters
  ADD BranchId INT NULL;
  
  -- Add foreign key constraint
  ALTER TABLE ServiceCenters
  ADD CONSTRAINT FK_ServiceCenters_BranchId FOREIGN KEY (BranchId) REFERENCES Branches(Id);
  
  PRINT 'Added BranchId column to ServiceCenters';
END
ELSE
BEGIN
  PRINT 'BranchId column already exists in ServiceCenters';
END

-- Update existing service centers with default branch (branch id 1)
-- Uncomment and customize as needed
-- UPDATE ServiceCenters SET BranchId = 1 WHERE BranchId IS NULL;
