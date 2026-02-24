-- Add BranchId column to ServiceCenters (if it doesn't already exist)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServiceCenters' AND COLUMN_NAME = 'BranchId')
BEGIN
  ALTER TABLE ServiceCenters
  ADD BranchId INT NULL;
  
  PRINT 'BranchId column added to ServiceCenters successfully';
END
ELSE
BEGIN
  PRINT 'BranchId column already exists';
END

-- Add the foreign key constraint (if it doesn't already exist)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_ServiceCenters_BranchId')
BEGIN
  ALTER TABLE ServiceCenters
  ADD CONSTRAINT FK_ServiceCenters_BranchId FOREIGN KEY (BranchId) REFERENCES Branches(Id);
  
  PRINT 'Foreign key constraint added';
END
ELSE
BEGIN
  PRINT 'Foreign key constraint already exists';
END

-- Assign service centers to branches (customize as needed)
-- Pune Service Centre -> Branch 1 (Delhi) or create new Pune branch
-- Mumbai Service Centre -> Branch 2 (Mumbai)
-- Bengaluru Service Centre -> Branch 3 (Bangalore)
-- Pune East Service Centre -> Branch 1 or Pune branch

-- First, ensure you have the branches:
IF NOT EXISTS (SELECT 1 FROM Branches WHERE BranchName = 'Pune Branch')
BEGIN
  INSERT INTO Branches (BranchName, Location, Phone, Email, Active) 
  VALUES ('Pune Branch', 'Pune', '020-555555', 'pune@branch.com', 1);
  PRINT 'Pune Branch created';
END

-- Now assign service centers to branches
UPDATE ServiceCenters SET BranchId = (SELECT Id FROM Branches WHERE BranchName = 'Pune Branch') 
WHERE CenterName IN ('Pune Service Centre', 'Pune East Service Centre');

UPDATE ServiceCenters SET BranchId = (SELECT Id FROM Branches WHERE BranchName = 'Mumbai Branch') 
WHERE CenterName = 'Mumbai Service Centre';

UPDATE ServiceCenters SET BranchId = (SELECT Id FROM Branches WHERE BranchName = 'Bangalore Branch') 
WHERE CenterName = 'Bengaluru Service Centre';

-- Verify the assignments
SELECT Id, CenterName, City, BranchId FROM ServiceCenters;
