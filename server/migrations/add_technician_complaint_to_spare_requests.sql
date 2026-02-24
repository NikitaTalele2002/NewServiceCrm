-- Make BranchId and ServiceCenterId nullable
ALTER TABLE SpareRequests ALTER COLUMN BranchId INT NULL;
ALTER TABLE SpareRequests ALTER COLUMN ServiceCenterId INT NULL;

-- Add TechnicianId and ComplaintId columns to SpareRequests table
ALTER TABLE SpareRequests ADD TechnicianId INT NULL;
ALTER TABLE SpareRequests ADD ComplaintId INT NULL;

-- Add foreign key constraints
ALTER TABLE SpareRequests ADD CONSTRAINT FK_SpareRequests_TechnicianId
FOREIGN KEY (TechnicianId) REFERENCES Technicians(Id);

ALTER TABLE SpareRequests ADD CONSTRAINT FK_SpareRequests_ComplaintId
FOREIGN KEY (ComplaintId) REFERENCES ComplaintRegistration(Id);

-- Add indexes for performance
CREATE INDEX IX_SpareRequests_TechnicianId ON SpareRequests(TechnicianId);
CREATE INDEX IX_SpareRequests_ComplaintId ON SpareRequests(ComplaintId);