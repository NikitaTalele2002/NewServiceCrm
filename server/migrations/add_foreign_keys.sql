-- MSSQL Migration Script: Add Foreign Key Constraints (Corrected)
-- Fixes:
-- 1. role_id (NOT NULL) cannot use SET NULL - use NO ACTION instead
-- 2. Self-referencing FKs cannot use CASCADE - use NO ACTION
-- 3. Product column data type mismatch - may need manual verification

-- 1. USERS Table - role_id FK (NOT NULL, so NO ACTION not SET NULL)
ALTER TABLE [users]
ADD CONSTRAINT [FK_users_roles_role_id]
FOREIGN KEY ([role_id]) REFERENCES [roles]([roles_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 2. USERS Table - created_by_userId FK (Self-ref cannot use CASCADE)
ALTER TABLE [users]
ADD CONSTRAINT [FK_users_users_created_by_userId]
FOREIGN KEY ([created_by_userId]) REFERENCES [users]([user_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 3. PRODUCTMODELS Table - Product FK (Verify data types match)
-- Checking: ProductModels.Product vs products.product_id
ALTER TABLE [ProductModels]
ADD CONSTRAINT [FK_ProductModels_products_Product]
FOREIGN KEY ([Product]) REFERENCES [products]([product_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 4. CUSTOMERS Table - city_id FK
ALTER TABLE [customers]
ADD CONSTRAINT [FK_customers_Cities_city_id]
FOREIGN KEY ([city_id]) REFERENCES [Cities]([Id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 5. CUSTOMERS Table - state_id FK
ALTER TABLE [customers]
ADD CONSTRAINT [FK_customers_States_state_id]
FOREIGN KEY ([state_id]) REFERENCES [States]([Id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 6. CUSTOMERS Table - pincode FK
ALTER TABLE [customers]
ADD CONSTRAINT [FK_customers_Pincodes_pincode]
FOREIGN KEY ([pincode]) REFERENCES [Pincodes]([Id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 7. CUSTOMERS Table - created_by FK
ALTER TABLE [customers]
ADD CONSTRAINT [FK_customers_users_created_by]
FOREIGN KEY ([created_by]) REFERENCES [users]([user_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 8. CUSTOMERSPRODUCTS Table - customer_id FK
ALTER TABLE [customers_products]
ADD CONSTRAINT [FK_customers_products_customers_customer_id]
FOREIGN KEY ([customer_id]) REFERENCES [customers]([customer_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 9. CUSTOMERSPRODUCTS Table - product_id FK
ALTER TABLE [customers_products]
ADD CONSTRAINT [FK_customers_products_products_product_id]
FOREIGN KEY ([product_id]) REFERENCES [products]([product_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 10. CUSTOMERSPRODUCTS Table - model_id FK
ALTER TABLE [customers_products]
ADD CONSTRAINT [FK_customers_products_ProductModels_model_id]
FOREIGN KEY ([model_id]) REFERENCES [ProductModels]([Id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 11. CUSTOMERSPRODUCTS Table - dealer_id FK
ALTER TABLE [customers_products]
ADD CONSTRAINT [FK_customers_products_dealers_dealer_id]
FOREIGN KEY ([dealer_id]) REFERENCES [dealers]([dealers_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 12. CUSTOMERSPRODUCTS Table - created_by FK
ALTER TABLE [customers_products]
ADD CONSTRAINT [FK_customers_products_users_created_by]
FOREIGN KEY ([created_by]) REFERENCES [users]([user_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 13. CUSTOMERSPRODUCTS Table - updated_by FK
ALTER TABLE [customers_products]
ADD CONSTRAINT [FK_customers_products_users_updated_by]
FOREIGN KEY ([updated_by]) REFERENCES [users]([user_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 14. TECHNICIANS Table - service_center_id FK
ALTER TABLE [technicians]
ADD CONSTRAINT [FK_technicians_service_centers_service_center_id]
FOREIGN KEY ([service_center_id]) REFERENCES [service_centers]([asc_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 15. GOODSMOVEMENTITEMS Table - carton_id FK
ALTER TABLE [goods_movement_items]
ADD CONSTRAINT [FK_goods_movement_items_cartons_carton_id]
FOREIGN KEY ([carton_id]) REFERENCES [cartons]([carton_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 16. GOODSMOVEMENTITEMS Table - movement_id FK
ALTER TABLE [goods_movement_items]
ADD CONSTRAINT [FK_goods_movement_items_stock_movement_movement_id]
FOREIGN KEY ([movement_id]) REFERENCES [stock_movement]([movement_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 17. GOODSMOVEMENTITEMS Table - spare_part_id FK
ALTER TABLE [goods_movement_items]
ADD CONSTRAINT [FK_goods_movement_items_spare_parts_spare_part_id]
FOREIGN KEY ([spare_part_id]) REFERENCES [spare_parts]([spare_part_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 18. SERVICEINVOICE Table - call_id FK
ALTER TABLE [service_invoices]
ADD CONSTRAINT [FK_service_invoices_calls_call_id]
FOREIGN KEY ([call_id]) REFERENCES [calls]([call_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 19. SERVICEINVOICE Table - asc_id FK
ALTER TABLE [service_invoices]
ADD CONSTRAINT [FK_service_invoices_users_asc_id]
FOREIGN KEY ([asc_id]) REFERENCES [users]([user_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 20. SERVICEINVOICE Table - technician_id FK
ALTER TABLE [service_invoices]
ADD CONSTRAINT [FK_service_invoices_technicians_technician_id]
FOREIGN KEY ([technician_id]) REFERENCES [technicians]([technician_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 21. SERVICEINVOICE Table - customer_id FK
ALTER TABLE [service_invoices]
ADD CONSTRAINT [FK_service_invoices_customers_customer_id]
FOREIGN KEY ([customer_id]) REFERENCES [customers]([customer_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 22. SERVICEINVOICE Table - created_by FK
ALTER TABLE [service_invoices]
ADD CONSTRAINT [FK_service_invoices_users_created_by]
FOREIGN KEY ([created_by]) REFERENCES [users]([user_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO

-- 23. SERVICEINVOICEITEMS Table - invoice_id FK
ALTER TABLE [service_invoice_items]
ADD CONSTRAINT [FK_service_invoice_items_service_invoices_invoice_id]
FOREIGN KEY ([invoice_id]) REFERENCES [service_invoices]([invoice_id])
ON DELETE NO ACTION
ON UPDATE NO ACTION
GO
