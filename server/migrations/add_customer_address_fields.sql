-- Migration to add new address fields to Customers table
-- Add HouseNumber, BuildingName, StreetName columns

ALTER TABLE Customers ADD HouseNumber VARCHAR(100) NULL;
ALTER TABLE Customers ADD BuildingName VARCHAR(200) NULL;
ALTER TABLE Customers ADD StreetName VARCHAR(200) NULL;