// src/constants/routes.constant.jsx

const ROUTES = {
  AUTH: {
    LOGIN: "/login",
    SIGNUP: "/signup",
    FORGOT_PASSWORD: "/forgot-password",
  },

  DASHBOARD: "/", 

  SERVICE_CENTER: {
    BASE: "/service-center",
    COMPLAINTS: "/service-center/complaints",
  },

  CALL_CENTRE: {
    BASE: "/call-centre",
    SEARCH: "/call-centre/search",
    REGISTER: "/call-centre/register",
  },

  INVENTORY: {
    BASE: "/inventory",
    RENTAL_ALLOCATION: "/inventory/rental-allocation",
    RENTAL_RETURN: "/inventory/rental-return",
    CURRENT_INVENTORY: "/inventory/current-inventory",
    ORDER_REQUEST: "/inventory/order-request",
    CONFIRM_REQUEST: "/inventory/confirm-request",
    SPARE_PART_RETURN: "/inventory/spare-part-return",
    GENERATE_DCF: "/inventory/generate-dcf",
  },

  TECHNICIANS: {
    BASE: "/technicians",
    ADD: "/technicians/add",
    VIEW: "/technicians/view",
  },

  PRODUCT_REPLACEMENT: {
    BASE: "/product-replacement",
    SET: "/product-replacement/set",
    HISTORY: "/product-replacement/history",
  },

  INVOICING: {
    BASE: "/invoicing",
    ADD: "/invoicing/add",
    VIEW: "/invoicing/view",
  },

  NOT_FOUND: "*",
};

export default ROUTES;


