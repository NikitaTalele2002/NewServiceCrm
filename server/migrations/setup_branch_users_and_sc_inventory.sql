-- =========== SETUP BRANCH USERS AND SERVICE CENTER INVENTORY ===========

-- Step 1: Add BranchId column to Users table if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'BranchId')
BEGIN
  ALTER TABLE Users ADD BranchId INT NULL;
END

-- Step 2: Create Branches table if not exists (should exist from earlier migration)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Branches')
BEGIN
  CREATE TABLE Branches (
    Id INT PRIMARY KEY IDENTITY(1,1),
    BranchName NVARCHAR(255) NOT NULL UNIQUE,
    Location NVARCHAR(500),
    Phone NVARCHAR(20),
    Email NVARCHAR(255),
    Active BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
  );
END

-- Step 3: Insert Branch records if they don't exist
IF NOT EXISTS (SELECT 1 FROM Branches WHERE BranchName = 'Roorkee Branch')
BEGIN
  INSERT INTO Branches (BranchName, Location, Phone, Email, Active, CreatedAt, UpdatedAt)
  VALUES ('Roorkee Branch', 'Roorkee, Uttarakhand', '01332-123456', 'roorkee@finolex.com', 1, GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM Branches WHERE BranchName = 'Mumbai Branch')
BEGIN
  INSERT INTO Branches (BranchName, Location, Phone, Email, Active, CreatedAt, UpdatedAt)
  VALUES ('Mumbai Branch', 'Mumbai, Maharashtra', '022-123456', 'mumbai@finolex.com', 1, GETDATE(), GETDATE());
END

-- Step 4: Assign ServiceCenters to Branches
-- Assign Thane (SC ID 1) to a branch (e.g., Mumbai)
IF EXISTS (SELECT 1 FROM Branches WHERE BranchName = 'Mumbai Branch')
BEGIN
  DECLARE @mumbaiId INT = (SELECT Id FROM Branches WHERE BranchName = 'Mumbai Branch');
  UPDATE ServiceCenters SET BranchId = @mumbaiId WHERE Id = 1 AND CenterName LIKE '%Thane%';
END

-- Assign Pune (SC ID 2) to a branch (e.g., a new Pune branch)
IF NOT EXISTS (SELECT 1 FROM Branches WHERE BranchName = 'Pune Branch')
BEGIN
  INSERT INTO Branches (BranchName, Location, Phone, Email, Active, CreatedAt, UpdatedAt)
  VALUES ('Pune Branch', 'Pune, Maharashtra', '020-123456', 'pune@finolex.com', 1, GETDATE(), GETDATE());
END

IF EXISTS (SELECT 1 FROM Branches WHERE BranchName = 'Pune Branch')
BEGIN
  DECLARE @puneId INT = (SELECT Id FROM Branches WHERE BranchName = 'Pune Branch');
  UPDATE ServiceCenters SET BranchId = @puneId WHERE Id = 2 AND CenterName LIKE '%Pune%';
END

-- Step 5: Create branch users and assign them BranchId
-- Branch 1 (Roorkee)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = 'roorkee_branch')
BEGIN
  DECLARE @roorkeeId INT = (SELECT Id FROM Branches WHERE BranchName = 'Roorkee Branch');
  INSERT INTO Users (Username, Password, Email, Role, BranchId, CreatedAt)
  VALUES ('roorkee_branch', 'branch123', 'roorkee_branch@finolex.com', 'branch', @roorkeeId, GETDATE());
END

-- Branch 2 (Mumbai)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = 'mumbai_branch')
BEGIN
  DECLARE @mumbaiId INT = (SELECT Id FROM Branches WHERE BranchName = 'Mumbai Branch');
  INSERT INTO Users (Username, Password, Email, Role, BranchId, CreatedAt)
  VALUES ('mumbai_branch', 'branch123', 'mumbai_branch@finolex.com', 'branch', @mumbaiId, GETDATE());
END

-- Branch 3 (Pune)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = 'pune_branch')
BEGIN
  DECLARE @puneId INT = (SELECT Id FROM Branches WHERE BranchName = 'Pune Branch');
  INSERT INTO Users (Username, Password, Email, Role, BranchId, CreatedAt)
  VALUES ('pune_branch', 'branch123', 'pune_branch@finolex.com', 'branch', @puneId, GETDATE());
END

-- Step 6: Create ServiceCenterInventory table (what branch approved items are stored with SC)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ServiceCenterInventory')
BEGIN
  CREATE TABLE ServiceCenterInventory (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ServiceCenterId INT NOT NULL,
    Sku NVARCHAR(100) NOT NULL,
    SpareName NVARCHAR(255) NOT NULL,
    GoodQty INT DEFAULT 0,
    DefectiveQty INT DEFAULT 0,
    ReceivedFrom NVARCHAR(255), -- e.g., 'Branch 1' or branch id
    ReceivedAt DATETIME,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ServiceCenterId) REFERENCES ServiceCenters(Id),
    UNIQUE (ServiceCenterId, Sku)
  );
END

-- Step 7: Create indexes for performance
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_sc_inventory_scId')
BEGIN
  CREATE INDEX idx_sc_inventory_scId ON ServiceCenterInventory(ServiceCenterId);
END

-- Step 8: Verify setup
PRINT 'Branch users setup complete.';
PRINT 'Branch credentials:';
PRINT '  roorkee_branch / branch123 (assigned to Roorkee Branch)';
PRINT '  mumbai_branch / branch123 (assigned to Mumbai Branch)';
PRINT '  pune_branch / branch123 (assigned to Pune Branch)';
PRINT '';
PRINT 'ServiceCenters assigned to branches (check Branches.Id):';
SELECT sc.Id, sc.CenterName, b.BranchName, b.Id AS BranchId
FROM ServiceCenters sc
LEFT JOIN Branches b ON sc.BranchId = b.Id;
