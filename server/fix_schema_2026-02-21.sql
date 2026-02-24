-- Auto-generated script to fix missing columns
-- Generated: 2026-02-21T10:08:41.232Z
-- Database: NewCRM

-- Table: [spare_requests] (Model: SpareRequest)
-- Missing columns: 10

ALTER TABLE [spare_requests] ADD [request_id] INT NULL;
ALTER TABLE [spare_requests] ADD [request_type] VARCHAR(50) NOT NULL;
ALTER TABLE [spare_requests] ADD [call_id] INT NULL;
ALTER TABLE [spare_requests] ADD [requested_source_type] VARCHAR(50) NOT NULL;
ALTER TABLE [spare_requests] ADD [requested_source_id] INT NOT NULL;
ALTER TABLE [spare_requests] ADD [requested_to_type] VARCHAR(50) NOT NULL;
ALTER TABLE [spare_requests] ADD [requested_to_id] INT NOT NULL;
ALTER TABLE [spare_requests] ADD [request_reason] VARCHAR(50) NOT NULL;
ALTER TABLE [spare_requests] ADD [status_id] INT NOT NULL;
ALTER TABLE [spare_requests] ADD [created_by] INT NULL;

-- Table: [spare_request_items] (Model: SpareRequestItem)
-- Missing columns: 8

ALTER TABLE [spare_request_items] ADD [id] INT NULL;
ALTER TABLE [spare_request_items] ADD [request_id] INT NOT NULL;
ALTER TABLE [spare_request_items] ADD [spare_id] INT NOT NULL;
ALTER TABLE [spare_request_items] ADD [requested_qty] INT NOT NULL;
ALTER TABLE [spare_request_items] ADD [approved_qty] INT NULL;
ALTER TABLE [spare_request_items] ADD [rejection_reason] NVARCHAR(MAX) NULL;
ALTER TABLE [spare_request_items] ADD [unit_price] DECIMAL(10,2) NULL;
ALTER TABLE [spare_request_items] ADD [line_price] DECIMAL(15,2) NULL;

-- Table: [customers_products] (Model: CustomersProducts)
-- Missing columns: 7

ALTER TABLE [customers_products] ADD [dealer_id] INT NULL;
ALTER TABLE [customers_products] ADD [purchase_invoice_no] VARCHAR(100) NULL;
ALTER TABLE [customers_products] ADD [amc_no] VARCHAR(100) NULL;
ALTER TABLE [customers_products] ADD [amc_start_date] DATE NULL;
ALTER TABLE [customers_products] ADD [amc_end_date] DATE NULL;
ALTER TABLE [customers_products] ADD [created_by] INT NULL;
ALTER TABLE [customers_products] ADD [updated_by] INT NULL;

-- Table: [calls] (Model: Calls)
-- Missing columns: 13

ALTER TABLE [calls] ADD [caller_mobile_no] VARCHAR(20) NULL;
ALTER TABLE [calls] ADD [remark] NVARCHAR(MAX) NULL;
ALTER TABLE [calls] ADD [visit_date] DATE NULL;
ALTER TABLE [calls] ADD [visit_time] VARCHAR(10) NULL;
ALTER TABLE [calls] ADD [customer_remark] NVARCHAR(MAX) NULL;
ALTER TABLE [calls] ADD [cancel_reason] VARCHAR(255) NULL;
ALTER TABLE [calls] ADD [cancel_remarks] NVARCHAR(MAX) NULL;
ALTER TABLE [calls] ADD [cancelled_by_userId] INT NULL;
ALTER TABLE [calls] ADD [cancelled_at] DATE NULL;
ALTER TABLE [calls] ADD [closed_by] DATE NULL;
ALTER TABLE [calls] ADD [closed_by_user_id] INT NULL;
ALTER TABLE [calls] ADD [repair_type] VARCHAR(50) NULL;
ALTER TABLE [calls] ADD [call_closure_source] VARCHAR(50) NULL;

-- Table: [call_spare_usage] (Model: CallSpareUsage)
-- Missing columns: 9

ALTER TABLE [call_spare_usage] ADD [usage_id] INT NULL;
ALTER TABLE [call_spare_usage] ADD [defect_id] INT NULL;
ALTER TABLE [call_spare_usage] ADD [issued_qty] INT NOT NULL;
ALTER TABLE [call_spare_usage] ADD [used_qty] INT NOT NULL;
ALTER TABLE [call_spare_usage] ADD [returned_qty] INT NOT NULL;
ALTER TABLE [call_spare_usage] ADD [usage_status] VARCHAR(50) NULL;
ALTER TABLE [call_spare_usage] ADD [used_by_tech_id] INT NULL;
ALTER TABLE [call_spare_usage] ADD [used_at] DATE NULL;
ALTER TABLE [call_spare_usage] ADD [remarks] NVARCHAR(MAX) NULL;

-- Table: [happy_codes] (Model: HappyCodes)
-- Missing columns: 8

ALTER TABLE [happy_codes] ADD [call_id] INT NOT NULL;
ALTER TABLE [happy_codes] ADD [generated_at] DATE NULL;
ALTER TABLE [happy_codes] ADD [used_at] DATE NULL;
ALTER TABLE [happy_codes] ADD [expires_at] DATE NULL;
ALTER TABLE [happy_codes] ADD [attempts_count] INT NULL;
ALTER TABLE [happy_codes] ADD [validated_by_user] INT NULL;
ALTER TABLE [happy_codes] ADD [resend_count] INT NULL;
ALTER TABLE [happy_codes] ADD [last_resend_at] DATE NULL;

-- Table: [tat_tracking] (Model: TATTracking)
-- Missing columns: 5

ALTER TABLE [tat_tracking] ADD [id] INT NULL;
ALTER TABLE [tat_tracking] ADD [tat_start_time] DATE NULL;
ALTER TABLE [tat_tracking] ADD [tat_end_time] DATE NULL;
ALTER TABLE [tat_tracking] ADD [tat_status] VARCHAR(50) NULL;
ALTER TABLE [tat_tracking] ADD [total_hold_minutes] INT NULL;

-- Table: [tat_holds] (Model: TATHolds)
-- Missing columns: 4

ALTER TABLE [tat_holds] ADD [tat_holds_id] INT NULL;
ALTER TABLE [tat_holds] ADD [hold_start_time] DATE NULL;
ALTER TABLE [tat_holds] ADD [hold_end_time] DATE NULL;
ALTER TABLE [tat_holds] ADD [created_by] INT NULL;

-- Table: [call_technician_assignment] (Model: CallTechnicianAssignment)
-- Missing columns: 5

ALTER TABLE [call_technician_assignment] ADD [assigned_by_user_id] INT NULL;
ALTER TABLE [call_technician_assignment] ADD [assigned_reason] VARCHAR(50) NULL;
ALTER TABLE [call_technician_assignment] ADD [assigned_at] DATE NULL;
ALTER TABLE [call_technician_assignment] ADD [unassigned_at] DATE NULL;
ALTER TABLE [call_technician_assignment] ADD [is_active] BIT NULL;

-- Table: [call_cancellation_requests] (Model: CallCancellationRequests)
-- Missing columns: 5

ALTER TABLE [call_cancellation_requests] ADD [cancellation_id] INT NULL;
ALTER TABLE [call_cancellation_requests] ADD [requested_by_role] INT NULL;
ALTER TABLE [call_cancellation_requests] ADD [requested_by_id] INT NOT NULL;
ALTER TABLE [call_cancellation_requests] ADD [request_status] VARCHAR(50) NULL;
ALTER TABLE [call_cancellation_requests] ADD [cancellation_remark] NVARCHAR(MAX) NULL;

-- Table: [service_invoices] (Model: ServiceInvoice)
-- Missing columns: 8

ALTER TABLE [service_invoices] ADD [invoice_id] INT NULL;
ALTER TABLE [service_invoices] ADD [invoice_no] VARCHAR(100) NOT NULL;
ALTER TABLE [service_invoices] ADD [technician_id] INT NULL;
ALTER TABLE [service_invoices] ADD [invoice_status] VARCHAR(50) NULL;
ALTER TABLE [service_invoices] ADD [invoice_type] VARCHAR(50) NOT NULL;
ALTER TABLE [service_invoices] ADD [subtotal_amount] DECIMAL(15,2) NULL;
ALTER TABLE [service_invoices] ADD [discount_amount] DECIMAL(10,2) NULL;
ALTER TABLE [service_invoices] ADD [payment_mode] VARCHAR(50) NULL;

-- Table: [service_invoice_items] (Model: ServiceInvoiceItem)
-- Missing columns: 7

ALTER TABLE [service_invoice_items] ADD [item_type] VARCHAR(50) NOT NULL;
ALTER TABLE [service_invoice_items] ADD [part_code] VARCHAR(100) NULL;
ALTER TABLE [service_invoice_items] ADD [description] NVARCHAR(MAX) NULL;
ALTER TABLE [service_invoice_items] ADD [hsn_sac_code] VARCHAR(50) NULL;
ALTER TABLE [service_invoice_items] ADD [qty] INT NOT NULL;
ALTER TABLE [service_invoice_items] ADD [tax_percent] DECIMAL(5,2) NULL;
ALTER TABLE [service_invoice_items] ADD [tax_amount] DECIMAL(10,2) NULL;

