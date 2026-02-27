import SparePartReturnRequest from '../pages/service_center/inventory_management/SparePartReturnRequest.jsx';
import ViewCart from '../pages/service_center/inventory_management/ViewCart.jsx';
import ReturnCart from '../pages/service_center/inventory_management/ReturnCart.jsx';
import PrintReturnChallan from '../pages/service_center/inventory_management/PrintReturnChallan.jsx';
import RSMReturnApproval from '../pages/rsm/RSMReturnApproval.jsx';

/**
 * Spare Part Return Request Routes
 * Add these routes to your main router configuration
 */

export const spareReturnRoutes = [
  // Service Center Routes
  {
    path: '/service-center/spare-return-request',
    element: <SparePartReturnRequest />,
    name: 'Create Return Request'
  },
  {
    path: '/service-center/spare-return-view-cart',
    element: <ViewCart />,
    name: 'View Cart'
  },
  {
    path: '/service-center/spare-return-cart/:requestId',
    element: <ReturnCart />,
    name: 'Return Cart Details'
  },
  {
    path: '/service-center/print-return-challan/:logDocId',
    element: <PrintReturnChallan />,
    name: 'Print Delivery Challan'
  },

  // RSM Routes
  {
    path: '/rsm/return-approvals',
    element: <RSMReturnApproval />,
    name: 'Return Request Approvals'
  }
];

/**
 * Integration Instructions:
 * 
 * 1. Import these routes in your main router file
 * 2. Add them to your route configuration
 * 
 * Example:
 * 
 * import { spareReturnRoutes } from './routes/sparePartReturnRoutes';
 * 
 * const router = createBrowserRouter([
 *   ...existingRoutes,
 *   ...spareReturnRoutes
 * ]);
 */
