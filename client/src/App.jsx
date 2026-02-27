import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { RoleProvider, useRole } from "./context/RoleContext";
import { MasterDataProvider } from "./context/MasterDataContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Loader from "./components/Loader";
import Sidebar from "./components/Sidebar";

// User Management Pages
import Login from "./pages/user_management/login.jsx";
import Signup from "./pages/user_management/signup.jsx";
import ForgotPwd from "./pages/user_management/forgot_pwd.jsx";

// Call Centre Pages
import CallCenterLayout from "./components/CallCenterLayout";
import SearchForm from "./pages/call_centre/SearchForm.jsx";
import CustomerCard from "./pages/call_centre/CustomerCard.jsx";
import AddCustomerForm from "./pages/call_centre/AddCustomerForm.jsx";
import ComplaintForm from "./pages/call_centre/ComplaintForm.jsx";
import CallUpdate from "./pages/call_centre/CallUpdate.jsx";
import RegisterProduct from "./pages/call_centre/RegisterProduct.jsx";
import ShowProducts from "./pages/call_centre/ShowProducts.jsx";
import ProductDetailsPage from "./pages/call_centre/ProductDetailsPage.jsx";
import ServiceRegistration from "./pages/call_centre/ServiceRegistration.jsx";
import CallCenterDashboardLayout from "./pages/call_centre/callCentreDashboardLayout.jsx";

// Service Center Pages
import DashboardSC from "./pages/service_center/dashboardSC.jsx";
import Technicians from "./pages/service_center/technicians/technicians.jsx";
import AddTechnician from "./pages/service_center/AddTechnicianRequest.jsx";
import ViewTechnician from "./pages/service_center/ManageTechnicians.jsx";
import ViewComplaints from "./pages/service_center/complaints/viewComplaints.jsx";
import AssignComplaint from "./pages/service_center/complaints/assignComplaint.jsx";
import PincodeMasters from "./pages/service_center/complaints/PincodeMasters.jsx";
import PrintChallan from "./pages/service_center/PrintChallan.jsx";
import RentalAllocation from "./pages/service_center/RentalAllocation.jsx";
import RentalReturn from "./pages/service_center/inventory_management/rental_return.jsx";
import OrderRequest from "./pages/service_center/inventory_management/order_request.jsx";
import ConfirmRequest from "./pages/service_center/inventory_management/confirm_request.jsx";
import SparePartReturn from "./pages/service_center/inventory_management/spare_part_return.jsx";
import GenerateDCF from "./pages/service_center/inventory_management/generate_DCF.jsx";
import TechnicianInventory from "./pages/service_center/inventory_management/technician_inventory.jsx";
import DCFStatus from "./pages/service_center/DCFStatus.jsx";
import DCFDetails from "./pages/service_center/DCFDetails.jsx";
import SpareReturnRequests from "./components/SpareReturnRequests";
import Dashboard from "./pages/service_center/monthly_claims/Dashboard.jsx";
import SubmitClaim from "./pages/service_center/monthly_claims/SubmitClaim.jsx";
import SetReplacement from "./pages/service_center/product_replacement/set_replacement.jsx";
import ViewReplacementHistory from "./pages/service_center/product_replacement/view_replacement_history.jsx";
import DashboardLayout from "./pages/service_center/serviceCenterLayout.jsx";
import ServiceCenterDashboard from "./pages/service_center/ServiceCenterDashboard.jsx";
import { CurrentInventory as BranchCurrentInventory } from "./pages/branch";
import TechnicianCurrentInventory from "./pages/service_center/TechnicianCurrentInventory.jsx";
import { TechnicianInventoryView } from "./components/technicians";

// Spare Part Return Request Pages
import SparePartReturnRequest from "./pages/service_center/inventory_management/SparePartReturnRequest.jsx";
import ViewCart from "./pages/service_center/inventory_management/ViewCart.jsx";
import ReturnCart from "./pages/service_center/inventory_management/ReturnCart.jsx";
import PrintReturnChallan from "./pages/service_center/inventory_management/PrintReturnChallan.jsx";
import ViewSpareReturnRequest from "./pages/service_center/inventory_management/ViewSpareReturnRequest.jsx";
import RSMReturnApproval from "./pages/rsm/RSMReturnApproval.jsx";
import CancellationRequestApproval from "./pages/rsm/CancellationRequestApproval.jsx";

// Branch Pages
import RsmCurrentInventory from "./pages/rsm/RsmCurrentInventory.jsx";
import RsmOrderRequestsPage from "./pages/rsm/RsmOrderRequestsPage.jsx";
import BranchReturnRequests from "./pages/branch/return_requests.jsx";
import BranchDashboard from "./pages/branch/Dashboard.jsx";
import SpareRequests from "./pages/branch/SpareRequests.jsx";
import BranchInventory from "./pages/branch/Inventory.jsx";
import StockAdjust from "./pages/branch/StockAdjust.jsx";
import BranchPrintChallan from "./pages/branch/PrintChallan.jsx";
import BranchDCFStatus from "./pages/branch/DCFStatus.jsx";
import BranchDCFDetails from "./pages/branch/DCFDetails.jsx";
import ApproveTechnicianRequests from "./pages/branch/ApproveTechnicianRequests.jsx";

// Admin Pages
import MasterUpload from "./pages/admin/MasterUpload.jsx";
import CodeManagement from "./pages/admin/CodeManagement.jsx";

// Home & Other Pages
import Home from "./pages/Home.jsx";

// ========== LOGIN SUCCESS MESSAGE COMPONENT ==========
function LoginSuccessMessage() {
  const { user, role } = useRole();
  
  return (
    <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
      <p className="font-semibold">✓ Login Successful!</p>
      <p className="text-sm">Welcome, {user?.username || "User"}! (Role: {role})</p>
    </div>
  );
}

// ========== PROTECTED MAIN LAYOUT WITH SIDEBAR ==========
function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div>
      {/* Top Navbar */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-30 flex items-center p-4 border-b h-[72px]">
        <img src="/vite.svg" alt="Company Logo" className="h-10 w-10 mr-4" />
        <h1 className="text-xl font-bold text-blue-600">Finolex Service CRM</h1>
      </div>
      
      {/* Sidebar */}
      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      
      {/* Main Content - Full Available Width */}
      <div className={`pt-[72px] transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-[20vw]'} min-h-screen overflow-x-hidden overflow-y-auto`}>
        <Outlet />
      </div>
    </div>
  );
}

// ========== CALL CENTER LAYOUT (MINIMAL) ==========
function CallCenterAppLayout() {
  return (
    <div className="w-full min-h-screen">
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-30 flex items-center p-4 border-b">
        <img src="/vite.svg" alt="Company Logo" className="h-10 w-10 mr-4" />
        <h1 className="text-xl font-bold text-blue-600">Call Center - Finolex Service CRM</h1>
      </div>
      <div className="pt-[72px]">
        <Outlet />
      </div>
    </div>
  );
}

// ========== SERVICE CENTER LAYOUT (WITH SIDEBAR) ==========
function ServiceCenterAppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const sidebarWidth = isSidebarCollapsed ? '64px' : '20vw';
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - 20% or 64px when collapsed */}
      <div style={{width: isSidebarCollapsed ? '64px' : '20vw', flexShrink: 0}}>
        <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      </div>
      
      {/* Right Container - 80% or remaining width */}
      <div className="flex flex-col flex-1">
        {/* Top Navbar - 80% width */}
        <div className="fixed top-0 bg-white shadow-md z-30 flex items-center p-4 border-b h-[72px]" style={{left: sidebarWidth, right: 0}}>
          <img src="/vite.svg" alt="Company Logo" className="h-10 w-10 mr-4" />
          <h1 className="text-xl font-bold text-blue-600">Service Center - Finolex Service CRM</h1>
        </div>
        
        {/* Main Content - 80% width, below navbar */}
        <div className="pt-[80px] overflow-y-auto flex-1 bg-gray-50 p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

// ========== APP ROUTES LOGIC ==========
function AppRoutes() {
  const { isAuthenticated, isLoading, role } = useRole();

  if (isLoading) {
    return <Loader />;
  }

  // ========== NOT AUTHENTICATED - SHOW LOGIN ==========
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPwd />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // ========== ADMIN ROLE - ADMIN SIDEBAR LAYOUT ========== 
  if (role === 'admin') {
    return (
      <Routes>
        <Route element={
          <div>
            {/* Top Navbar */}
            <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-30 flex items-center p-4 border-b h-[72px]">
              <img src="/vite.svg" alt="Company Logo" className="h-10 w-10 mr-4" />
              <h1 className="text-xl font-bold text-blue-600">Admin - Finolex Service CRM</h1>
            </div>
            {/* Sidebar */}
            <Sidebar />
            {/* Main Content */}
            <div className="pt-[72px] ml-[20vw] min-h-screen overflow-x-hidden overflow-y-auto">
              <Outlet />
            </div>
          </div>
        }>
          <Route path="/admin/master-upload" element={<MasterUpload />} />
          <Route path="/admin/code-management" element={<CodeManagement />} />
          <Route path="/" element={<Navigate to="/admin/master-upload" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin/master-upload" replace />} />
      </Routes>
    );
  }

  // ========== CALL CENTER ROLE - SIDEBAR LAYOUT ==========
  if (role === 'call_center') {
    return (
      <Routes>
        <Route element={<CallCenterLayout />}>
          <Route path="/call-centre" element={<SearchForm />} />
          <Route path="/call-centre/dashboard" element={<SearchForm />} />
          <Route path="/call-centre/search" element={<SearchForm />} />
          <Route path="/call-centre/service-registration" element={<ServiceRegistration />} />
          <Route path="/call-centre/add-customer" element={<AddCustomerForm />} />
          <Route path="/call-centre/register-product" element={<RegisterProduct />} />
          <Route path="/call-centre/complaint" element={<ComplaintForm />} />
          <Route path="/call-centre/show" element={<ShowProducts />} />
          <Route path="/call-centre/call-update" element={<CallUpdate />} />
          <Route path="/" element={<Navigate to="/call-centre/service-registration" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/call-centre/service-registration" replace />} />
      </Routes>
    );
  }

  // ========== SERVICE CENTER ROLE - CLEAN LAYOUT ==========
  if (role === 'service_center') {
    return (
      <Routes>
        <Route element={<ServiceCenterAppLayout />}>
          <Route path="/service-center" element={<Outlet />}>
            <Route path="dashboard" element={<ServiceCenterDashboard />} />
            <Route path="dashboardSC" element={<DashboardSC />} />
            <Route path="technician-current-inventory" element={<TechnicianCurrentInventory />} />

            {/* Inventory */}
            <Route path="inventory" element={<Outlet />}>
              <Route path="order-request" element={<OrderRequest />} />
              <Route path="spare-return" element={<SpareReturnRequests />} />
              <Route path="confirm-request" element={<ConfirmRequest />} />
              <Route path="rental-allocation" element={<RentalAllocation />} />
              <Route path="rental-return" element={<RentalReturn />} />
              <Route path="technician-inventory" element={<TechnicianInventory />} />
              <Route path="technician-inventory-view" element={<TechnicianInventoryView />} />
              <Route path="current-inventory" element={<BranchCurrentInventory />} />
              <Route path="generate-dcf" element={<GenerateDCF />} />
              <Route path="print-challan" element={<PrintChallan />} />
              <Route path="dcf-status" element={<DCFStatus />} />
              <Route path="dcf-details/:id" element={<DCFDetails />} />
              {/* Spare Part Return Request Workflow */}
              <Route path="spare-return-request" element={<SparePartReturnRequest />} />
              <Route path="view-cart" element={<ViewCart />} />
              <Route path="return-cart/:requestId" element={<ReturnCart />} />
              <Route path="view-spare-return" element={<ViewSpareReturnRequest />} />
              <Route path="print-return-challan/:requestId" element={<PrintReturnChallan />} />
            </Route>

            {/* Technicians */}
            <Route path="technicians" element={<Outlet />}>
              <Route path="technicians" element={<Technicians />} />
              <Route path="add" element={<AddTechnician />} />
              <Route path="view" element={<ViewTechnician />} />
            </Route>

            {/* Product Replacement */}
            <Route path="product-replacement" element={<Outlet />}>
              <Route path="set" element={<SetReplacement />} />
              <Route path="history" element={<ViewReplacementHistory />} />
            </Route>

            {/* Monthly Claims */}
            <Route path="monthly-claims" element={<Outlet />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="submit-claim" element={<SubmitClaim />} />
            </Route>

            {/* Complaints */}
            <Route path="complaints" element={<Outlet />}>
              <Route index element={<ViewComplaints />} />
              <Route path="view" element={<ViewComplaints />} />
              <Route path="assign" element={<AssignComplaint />} />
            </Route>

            {/* Call Management */}
            <Route path="call-management" element={<Outlet />}>
              <Route path="call-update" element={<CallUpdate />} />
            </Route>
            <Route path="call-update" element={<CallUpdate />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/service-center/complaints/view" replace />} />
        <Route path="*" element={<Navigate to="/service-center/complaints/view" replace />} />
      </Routes>
    );
  }

  // ========== DEFAULT / BRANCH / OTHER ROUTES ==========
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Home */}
        <Route path="/" element={<Home />} />

        {/* ========== BRANCH ROUTES ========== */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["admin", "branch", "rsm"]}>
              <Outlet />
            </ProtectedRoute>
          }>
          <Route path="/branch" element={<Outlet />}>
            <Route index element={<BranchDashboard />} />
            <Route path="dashboard" element={<BranchDashboard />} />
            <Route path="requests" element={<SpareRequests />} />
            <Route path="returns" element={<BranchReturnRequests />} />
            <Route path="return-approvals" element={<RSMReturnApproval />} />
            <Route path="inventory" element={<BranchInventory />} />
            <Route path="current-inventory" element={
              role === 'rsm' ? <RsmCurrentInventory /> : <BranchCurrentInventory />
            } />
            {/* RSM Order Requests route */}
            <Route path="rsm-order-requests" element={<ProtectedRoute allowedRoles={["rsm"]}><RsmOrderRequestsPage /></ProtectedRoute>} />
            {/* RSM Cancellation Request Approvals route */}
            <Route path="cancellation-approvals" element={<ProtectedRoute allowedRoles={["rsm"]}><CancellationRequestApproval /></ProtectedRoute>} />
                        <Route path="rsm-current-inventory" element={<RsmCurrentInventory />} />
            <Route path="stock-adjust" element={<StockAdjust />} />
            <Route path="print-challan" element={<BranchPrintChallan />} />
            <Route path="dcf-status" element={<BranchDCFStatus />} />
            <Route path="dcf-details/:id" element={<BranchDCFDetails />} />
            <Route path="approve-technician-requests" element={<ApproveTechnicianRequests />} />
          </Route>
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

// ========== MAIN APP COMPONENT WITH PROVIDERS ==========
export default function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <MasterDataProvider>
          <AppRoutes />
        </MasterDataProvider>
      </RoleProvider>
    </BrowserRouter>
  );
}
