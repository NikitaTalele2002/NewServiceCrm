-- =========== CREATE SPARE REQUESTS AND ITEMS TABLES ===========
-- This migration creates the tables needed for the branch/SC spare request workflow

-- Create SpareRequests table if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SpareRequests')
BEGIN
  CREATE TABLE SpareRequests (
    Id INT PRIMARY KEY IDENTITY(1,1),
    BranchId INT,
    ServiceCenterId INT,
    RequestNumber NVARCHAR(50) NOT NULL UNIQUE,
    Status NVARCHAR(50) DEFAULT 'pending',
    ApprovedAt DATETIME NULL,
    ApprovedBy NVARCHAR(255) NULL,
    ForwardedAt DATETIME NULL,
    ForwardedTo NVARCHAR(255) NULL,
    Notes NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (BranchId) REFERENCES Branches(Id),
    FOREIGN KEY (ServiceCenterId) REFERENCES ServiceCenters(Id)
  );
  PRINT 'SpareRequests table created.';
END
ELSE
BEGIN
  PRINT 'SpareRequests table already exists.';
END

-- Create SpareRequestItems table if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SpareRequestItems')
BEGIN
  CREATE TABLE SpareRequestItems (
    Id INT PRIMARY KEY IDENTITY(1,1),
    RequestId INT NOT NULL,
    Sku NVARCHAR(100) NOT NULL,
    SpareName NVARCHAR(255) NOT NULL,
    RequestedQty INT NOT NULL,
    ApprovedQty INT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (RequestId) REFERENCES SpareRequests(Id) ON DELETE CASCADE,
    INDEX idx_request_id (RequestId)
  );
  PRINT 'SpareRequestItems table created.';
END
ELSE
BEGIN
  PRINT 'SpareRequestItems table already exists.';
END

-- Create BranchInventory table if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BranchInventory')
BEGIN
  CREATE TABLE BranchInventory (
    Id INT PRIMARY KEY IDENTITY(1,1),
    BranchId INT NOT NULL,
    Sku NVARCHAR(100) NOT NULL,
    SpareName NVARCHAR(255) NOT NULL,
    GoodQty INT DEFAULT 0,
    DefectiveQty INT DEFAULT 0,
    MinimumStockLevel INT DEFAULT 5,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (BranchId) REFERENCES Branches(Id),
    UNIQUE (BranchId, Sku),
    INDEX idx_branch_id (BranchId)
  );
  PRINT 'BranchInventory table created.';
END
ELSE
BEGIN
  PRINT 'BranchInventory table already exists.';
END

-- Create ServiceCenterInventory table if it doesn't exist
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
    UNIQUE (ServiceCenterId, Sku),
    INDEX idx_service_center_id (ServiceCenterId)
  );
  PRINT 'ServiceCenterInventory table created.';
END
ELSE
BEGIN
  PRINT 'ServiceCenterInventory table already exists.';
END

-- Ensure ServiceCenters table has BranchId column
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServiceCenters' AND COLUMN_NAME = 'BranchId')
BEGIN
  ALTER TABLE ServiceCenters ADD BranchId INT NULL;
  PRINT 'BranchId column added to ServiceCenters table.';
END
ELSE
BEGIN
  PRINT 'BranchId column already exists in ServiceCenters table.';
END

-- Assign Service Centers to Branches (if not already assigned)
IF EXISTS (SELECT 1 FROM ServiceCenters WHERE Id = 1 AND BranchId IS NULL)
BEGIN
  UPDATE ServiceCenters SET BranchId = 2 WHERE Id = 1;
  PRINT 'ServiceCenter ID 1 (Thane) assigned to Branch 2 (Mumbai)';
END

IF EXISTS (SELECT 1 FROM ServiceCenters WHERE Id = 2 AND BranchId IS NULL)
BEGIN
  UPDATE ServiceCenters SET BranchId = 3 WHERE Id = 2;
  PRINT 'ServiceCenter ID 2 (Pune) assigned to Branch 3 (Pune)';
END

-- Verify all tables exist
PRINT '';
PRINT '========== TABLES CREATED ==========';
PRINT 'SpareRequests, SpareRequestItems, BranchInventory, ServiceCenterInventory tables are ready.';
PRINT '';
PRINT 'ServiceCenter to Branch assignments:';
SELECT sc.Id, sc.CenterName, ISNULL(b.BranchName, 'Not Assigned') as BranchName
FROM ServiceCenters sc
LEFT JOIN Branches b ON sc.BranchId = b.Id;

