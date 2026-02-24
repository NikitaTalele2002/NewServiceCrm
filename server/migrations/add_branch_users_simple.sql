-- =========== ADD BRANCH USERS ===========
-- Simple script to insert branch users into Users table

-- First, create Branches table if it doesn't exist
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
  
  -- Insert default branches
  INSERT INTO Branches (BranchName, Location, Phone, Email, Active, CreatedAt, UpdatedAt)
  VALUES 
    ('Roorkee Branch', 'Roorkee, Uttarakhand', '01332-123456', 'roorkee@finolex.com', 1, GETDATE(), GETDATE()),
    ('Mumbai Branch', 'Mumbai, Maharashtra', '022-123456', 'mumbai@finolex.com', 1, GETDATE(), GETDATE()),
    ('Pune Branch', 'Pune, Maharashtra', '020-123456', 'pune@finolex.com', 1, GETDATE(), GETDATE());
  
  PRINT 'Branches table created and populated.';
END
ELSE
BEGIN
  PRINT 'Branches table already exists.';
END

-- Add BranchId column to Users table if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'BranchId')
BEGIN
  ALTER TABLE Users ADD BranchId INT NULL;
  PRINT 'BranchId column added to Users table.';
END
ELSE
BEGIN
  PRINT 'BranchId column already exists in Users table.';
END

-- Add Email column to Users table if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'Email')
BEGIN
  ALTER TABLE Users ADD Email NVARCHAR(255) NULL;
  PRINT 'Email column added to Users table.';
END
ELSE
BEGIN
  PRINT 'Email column already exists in Users table.';
END

-- =========== INSERT BRANCH USERS ===========

-- Branch 1 (Roorkee)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = 'roorkee_branch')
BEGIN
  INSERT INTO Users (Username, Password, Email, Role, BranchId, CreatedAt)
  VALUES ('roorkee_branch', 'branch123', 'roorkee_branch@finolex.com', 'branch', 1, GETDATE());
  PRINT 'User roorkee_branch created (BranchId=1)';
END
ELSE
BEGIN
  PRINT 'User roorkee_branch already exists.';
END

-- Branch 2 (Mumbai)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = 'mumbai_branch')
BEGIN
  INSERT INTO Users (Username, Password, Email, Role, BranchId, CreatedAt)
  VALUES ('mumbai_branch', 'branch123', 'mumbai_branch@finolex.com', 'branch', 2, GETDATE());
  PRINT 'User mumbai_branch created (BranchId=2)';
END
ELSE
BEGIN
  PRINT 'User mumbai_branch already exists.';
END

-- Branch 3 (Pune)
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = 'pune_branch')
BEGIN
  INSERT INTO Users (Username, Password, Email, Role, BranchId, CreatedAt)
  VALUES ('pune_branch', 'branch123', 'pune_branch@finolex.com', 'branch', 3, GETDATE());
  PRINT 'User pune_branch created (BranchId=3)';
END
ELSE
BEGIN
  PRINT 'User pune_branch already exists.';
END

-- =========== CREATE SERVICE CENTER INVENTORY TABLE ===========
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ServiceCenterInventory')
BEGIN
  CREATE TABLE ServiceCenterInventory (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ServiceCenterId INT NOT NULL,
    Sku NVARCHAR(100) NOT NULL,
    SpareName NVARCHAR(255) NOT NULL,
    GoodQty INT DEFAULT 0,
    DefectiveQty INT DEFAULT 0,
    ReceivedFrom NVARCHAR(255),
    ReceivedAt DATETIME,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ServiceCenterId) REFERENCES ServiceCenters(Id),
    UNIQUE (ServiceCenterId, Sku)
  );
  PRINT 'ServiceCenterInventory table created.';
END
ELSE
BEGIN
  PRINT 'ServiceCenterInventory table already exists.';
END

-- =========== ASSIGN SERVICE CENTERS TO BRANCHES ===========
-- Assign Thane (SC ID 1) to Mumbai Branch (Branch ID 2)
IF EXISTS (SELECT 1 FROM ServiceCenters WHERE Id = 1)
BEGIN
  UPDATE ServiceCenters SET BranchId = 2 WHERE Id = 1;
  PRINT 'ServiceCenter ID 1 (Thane) assigned to Branch 2 (Mumbai)';
END

-- Assign Pune (SC ID 2) to Pune Branch (Branch ID 3)
IF EXISTS (SELECT 1 FROM ServiceCenters WHERE Id = 2)
BEGIN
  UPDATE ServiceCenters SET BranchId = 3 WHERE Id = 2;
  PRINT 'ServiceCenter ID 2 (Pune) assigned to Branch 3 (Pune)';
END

-- =========== VERIFICATION ===========
PRINT '';
PRINT '========== SETUP COMPLETE ==========';
PRINT '';
PRINT 'Branch Users Created:';
SELECT UserID, Username, Password, Email, Role, BranchId FROM Users WHERE Role = 'branch' ORDER BY UserID;
PRINT '';
PRINT 'Service Center Assignments:';
SELECT sc.Id, sc.CenterName, b.BranchName, b.Id AS BranchId 
FROM ServiceCenters sc
LEFT JOIN Branches b ON sc.BranchId = b.Id;
PRINT '';
PRINT 'Branch Details:';
SELECT Id, BranchName, Location, Phone FROM Branches ORDER BY Id;
