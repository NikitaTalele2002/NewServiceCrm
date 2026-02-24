-- Fix for Branches table UpdatedAt issue
-- Drop and recreate Branches table with proper defaults, or alter existing

-- Option 1: If you want to keep the existing Branches table, just alter the column to allow NULL
ALTER TABLE Branches ALTER COLUMN UpdatedAt DATETIME NULL;

-- OR Option 2: Drop and recreate (if no data to preserve)
-- DROP TABLE IF EXISTS SpareRequestItems;
-- DROP TABLE IF EXISTS SpareRequests;
-- DROP TABLE IF EXISTS BranchInventory;
-- DROP TABLE IF EXISTS Branches;

-- Then create fresh:
CREATE TABLE Branches (
  Id INT PRIMARY KEY IDENTITY(1,1),
  BranchName NVARCHAR(255) NOT NULL UNIQUE,
  Location NVARCHAR(500),
  Phone NVARCHAR(20),
  Email NVARCHAR(255),
  Active BIT DEFAULT 1,
  CreatedAt DATETIME DEFAULT GETDATE(),
  UpdatedAt DATETIME DEFAULT GETDATE() NOT NULL
);

-- Now insert branches (UpdatedAt will be automatically filled)
INSERT INTO Branches (BranchName, Location, Phone, Email, Active)
VALUES 
  ('Pune Branch', 'Pune', '020-555555', 'pune@branch.com', 1),
  ('Mumbai Branch', 'Mumbai', '9876543211', 'mumbai@branch.com', 1),
  ('Bangalore Branch', 'Bangalore', '9876543212', 'bangalore@branch.com', 1);

-- Verify
SELECT * FROM Branches;
