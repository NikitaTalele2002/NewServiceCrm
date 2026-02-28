import express from "express";
import cors from "cors";
import { connectDB, sequelize } from "./db.js";
import customersRoute from "./routes/customers.js";
import complaintsRoute from "./routes/complaints.new.js";
import techniciansRoute from "./routes/technicians.js";
import authRoute from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import locationRoute from "./routes/location.js";
import branchRoute from "./routes/branch.js";
import spareRequestsRoute from "./routes/spareRequests.js";
import rsmRoute from "./routes/rsm.js";
import hodRoute from "./routes/hod.js";
import inventoryRoute from "./routes/inventory.js";
import technicianStatusRequestsRoute from "./routes/technician_status_requests.js";
import productHierarchyRoute from "./routes/productHierarchy.js";
import serviceInventoryCurrentRouter from "./routes/service_inventory_current.js";
import callCenterRoute from "./routes/callCenter.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import branchInventoryCurrentRouter from "./routes/branch_inventory_current.js";
import logisticsRoute from "./routes/logistics.js";
import technicianScSpareRequestsRoute from "./routes/technician-sc-spare-requests.js";
import technicianSpareReturnsRoute from "./routes/technician-spare-returns.js";
import spareReturnRequestsRoute from "./routes/spare-return-requests.js";
import sparePartReturnsRoute from "./routes/sparePartReturns.js";
import ascBranchRequestsRoute from "./routes/ascBranchRequests.js";
import scBranchRequestsRoute from "./routes/scBranchRequests.js";
import technicianTrackingRoute from "./routes/technician-tracking.js";
import attachmentRoutes from "./routes/attachmentRoutes.js";
import servicecenterRoute from "./routes/servicecenter.js";

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// Serve static files from uploads folder
app.use('/uploads', express.static('uploads'));

// TEST ROUTE
app.get("/api/test", async (req, res) => {
  try {
    const [result] = await sequelize.query("SELECT GETDATE() AS CurrentTime");
    res.json({ ok: true, time: result[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ROUTES - COMMENTED OUT FOR TESTING
app.use("/api/customers", customersRoute);
app.use("/api/complaints", complaintsRoute);
// app.use("/api/products", productsRoute);
app.use("/api/location", locationRoute);
app.use("/api/technicians", techniciansRoute);
// // Auto-assignment routes (assign nearest service centre)
// app.use("/api", autoAssignRoute);
app.use("/api/auth", authRoute);
app.use("/api/upload", uploadRoutes);
// Admin routes (authentication & management)
app.use("/api/admin", adminRouter);
// Branch APIs (branch.js contains branch dashboard, requests, approvals)
app.use("/api/branch", branchRoute);
app.use("/api/branch", branchInventoryCurrentRouter);
// // Branch role APIs
// app.use("/api/branch", branchRoute);
// Spare requests
app.use("/api/spare-requests", spareRequestsRoute);
// Technician to Service Center spare requests (Rental Allocation workflow)
app.use("/api/technician-sc-spare-requests", technicianScSpareRequestsRoute);
// Technician spare returns (defective & unused spares after call completion)
app.use("/api/technician-spare-returns", technicianSpareReturnsRoute);
// ASC to Branch spare requests (return of defective/excess)
app.use("/api/asc-branch-requests", ascBranchRequestsRoute);
// Service Center to Branch spare requests
app.use("/api/sc-branch-requests", scBranchRequestsRoute);
// Spare return requests (return of defective/remaining spares)
app.use("/api/spare-return-requests", spareReturnRequestsRoute);
// Spare part returns (ASC to Plant return workflow)
app.use("/api/spare-returns", sparePartReturnsRoute);
// Technician spare consumption & TAT tracking
app.use("/api/technician-tracking", technicianTrackingRoute);
app.use("/api/rsm", rsmRoute);
app.use("/api/hod", hodRoute);
// Inventory - current user's inventory
app.use('/api/inventory', inventoryRoute);
// Returns
// app.use("/api/returns", returnsRoute);
// Technician status requests
app.use("/api/technician-status-requests", technicianStatusRequestsRoute);
// Service center routes
app.use("/api/servicecenter", servicecenterRoute);
// // Monthly claims / invoices
// app.use("/api/monthly-claims", monthlyClaimsRoute);
// Product hierarchy
app.use("/api/products", productHierarchyRoute);

// ACTIVE ROUTE ONLY
// Call center workflows
app.use("/api/call-center", callCenterRoute);

// Logistics & SAP Integration
app.use("/api/logistics", logisticsRoute);

// Attachments
app.use("/api/attachments", attachmentRoutes);

// GLOBAL ERROR HANDLER MIDDLEWARE
// Must be defined AFTER all routes
app.use((err, req, res, next) => {
  console.error('❌ Global error handler caught:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  // Always return JSON, never HTML
  res.status(err.status || 500).json({
    ok: false,
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// SERVER
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Start listening immediately so frontend doesn't get ERR_CONNECTION_REFUSED
  const server = app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });

  // Try to connect to DB in background; log errors but don't prevent server from running
  connectDB()
    .then(() => console.log('Background DB connection successful'))
    .catch((err) => console.error('Background DB connection failed:', err && err.message ? err.message : err));

  return server;
};

startServer();
