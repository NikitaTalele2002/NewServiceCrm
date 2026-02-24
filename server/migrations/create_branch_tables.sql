-- =========== BRANCH MANAGEMENT SCHEMA ===========

-- Branches (distribution centers)
CREATE TABLE IF NOT EXISTS Branches (
  Id INT PRIMARY KEY IDENTITY(1,1),
  BranchName NVARCHAR(255) NOT NULL UNIQUE,
  Location NVARCHAR(500),
  Phone NVARCHAR(20),
  Email NVARCHAR(255),
  Active BIT DEFAULT 1,
  CreatedAt DATETIME DEFAULT GETDATE(),
  UpdatedAt DATETIME DEFAULT GETDATE()
);

-- Branch Inventory (good and defective spares per branch)
CREATE TABLE IF NOT EXISTS BranchInventory (
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
  UNIQUE (BranchId, Sku)
);

-- Spare Requests (raised by Service Centers to Branches)
CREATE TABLE IF NOT EXISTS SpareRequests (
  Id INT PRIMARY KEY IDENTITY(1,1),
  BranchId INT NOT NULL,
  ServiceCenterId INT NOT NULL,
  RequestNumber NVARCHAR(100) UNIQUE,
  Status NVARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, forwarded, delivered
  ApprovedAt DATETIME,
  ApprovedBy NVARCHAR(255),
  ForwardedAt DATETIME,
  ForwardedTo NVARCHAR(255), -- depot location
  Notes NVARCHAR(1000),
  CreatedAt DATETIME DEFAULT GETDATE(),
  UpdatedAt DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (BranchId) REFERENCES Branches(Id),
  FOREIGN KEY (ServiceCenterId) REFERENCES ServiceCenters(Id)
);

-- Spare Request Items (line items in a spare request)
CREATE TABLE IF NOT EXISTS SpareRequestItems (
  Id INT PRIMARY KEY IDENTITY(1,1),
  RequestId INT NOT NULL,
  Sku NVARCHAR(100) NOT NULL,
  SpareName NVARCHAR(255) NOT NULL,
  RequestedQty INT NOT NULL,
  ApprovedQty INT DEFAULT 0,
  CreatedAt DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (RequestId) REFERENCES SpareRequests(Id) ON DELETE CASCADE
);

-- =========== INDEXES ===========
CREATE INDEX idx_branchInventory_branchId ON BranchInventory(BranchId);
CREATE INDEX idx_spareRequests_branchId ON SpareRequests(BranchId);
CREATE INDEX idx_spareRequests_scId ON SpareRequests(ServiceCenterId);
CREATE INDEX idx_spareRequests_status ON SpareRequests(Status);
CREATE INDEX idx_spareRequestItems_requestId ON SpareRequestItems(RequestId);
