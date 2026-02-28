import { Sequelize, DataTypes } from "sequelize";
import CustomerFactory from "./Customer.js";
import UsersFactory from "./Users.js";
import StateFactory from "./State.js";
import CityFactory from "./City.js";
import PincodeFactory from "./Pincode.js";
import ProductGroupFactory from "./ProductGroup.js";
import ProductModelFactory from "./ProductModel.js";
import SparePartFactory from "./SparePart.js";
import CityTierMasterFactory from "./CityTierMaster.js";
import SparePartMSLFactory from "./SparePartMSL.js";
import SpareRequestFactory from "./SpareRequest.js";
import SpareRequestItemFactory from "./SpareRequestItem.js";
import RolesFactory from "./Roles.js";
import AccessControlFactory from "./AccessControl.js";
import DealersFactory from "./Dealers.js";
import ReportingAuthorityFactory from "./ReportingAuthority.js";
import ZonesFactory from "./Zones.js";
import PlantFactory from "./Plant.js";
import RSMFactory from "./RSM.js";
import CustomersProductsFactory from "./CustomersProducts.js";
import StatusFactory from "./Status.js";
import SubStatusFactory from "./SubStatus.js";
import CallsFactory from "./Calls.js";
import CallSpareUsageFactory from "./CallSpareUsage.js";
import AttachmentsFactory from "./Attachments.js";
import AttachmentAccessFactory from "./AttachmentAccess.js";
import HappyCodesFactory from "./HappyCodes.js";
import TATTrackingFactory from "./TATTracking.js";
import TATHoldsFactory from "./TATHolds.js";
import ActionLogFactory from "./ActionLog.js";
import ApprovalsFactory from "./Approvals.js";
import SpareInventoryFactory from "./SpareInventory.js";
import StockMovementFactory from "./StockMovement.js";
import CartonsFactory from "./Cartons.js";
import GoodsMovementItemsFactory from "./GoodsMovementItems.js";
import ServiceCenterFactory from "./ServiceCenter.js";
import TechniciansFactory from "./Technicians.js";
import CallTechnicianAssignmentFactory from "./CallTechnicianAssignment.js";
import CallCancellationRequestsFactory from "./CallCancellationRequests.js";
import LogisticsDocumentsFactory from "./LogisticsDocuments.js";
import LogisticsDocumentItemsFactory from "./LogisticsDocumentItems.js";
import ServiceInvoiceFactory from "./ServiceInvoice.js";
import ServiceInvoiceItemFactory from "./ServiceInvoiceItem.js";
import DefectMasterFactory from "./DefectMaster.js";
import DefectSparesFactory from "./DefectSpares.js";
import ModelDefectsFactory from "./ModelDefects.js";
import EntityChangeRequestsFactory from "./EntityChangeRequests.js";
import LedgerFactory from "./Ledger.js";
import ReplacementsFactory from "./Replacements.js";
import ReimbursementFactory from "./Reimbursement.js";
import RSMStateMappingFactory from "./RSMStateMapping.js";
import SAPDocumentsFactory from "./SAPDocuments.js";
import SAPDocumentItemsFactory from "./SAPDocumentItems.js";
import ServiceCenterFinancialFactory from "./ServiceCenterFinancial.js";
import ServiceCenterPincodesFactory from "./ServiceCenterPincodes.js";
import ProductMasterFactory from "./ProductMaster.js";
import { sequelize } from "../db.js";
import dotenv from "dotenv";

dotenv.config();

let Customer, Product, ProductMaster, Users, State, City, CityTierMaster, Pincode, ProductGroup, ProductModel, SparePart, SparePartMSL, SpareRequest, SpareRequestItem, Roles, AccessControl, Dealers, ReportingAuthority, Zones, Plant, RSM, CustomersProducts, Status, SubStatus, Calls, CallSpareUsage, Attachments, AttachmentAccess, HappyCodes, TATTracking, TATHolds, ActionLog, Approvals, SpareInventory, StockMovement, Cartons, GoodsMovementItems, ServiceCenter, Technicians, CallTechnicianAssignment, CallCancellationRequests, LogisticsDocuments, LogisticsDocumentItems, ServiceInvoice, ServiceInvoiceItem, DefectMaster, DefectSpares, ModelDefects, EntityChangeRequests, Ledger, Replacements, Reimbursement, RSMStateMapping, SAPDocuments, SAPDocumentItems, ServiceCenterFinancial, ServiceCenterPincodes;

try {
  console.log("Loading Customer model...");
  Customer = CustomerFactory(sequelize, DataTypes);
  console.log("Customer model loaded");
} catch (err) {
  console.error("Failed to load Customer model:", err.message);
}

// No separate Product factory file in this codebase; `Product` will be
// aliased to `ProductMaster` below after ProductMaster is loaded.

try {
  console.log("Loading ProductMaster model...");
  ProductMaster = ProductMasterFactory(sequelize, DataTypes);
  console.log("ProductMaster model loaded");
  // If Product factory did not load, alias Product to ProductMaster
  if (!Product) {
    Product = ProductMaster;
    console.log("Aliased Product -> ProductMaster");
  }
} catch (err) {
  console.error("Failed to load ProductMaster model:", err.message);
}

try {
  console.log("Loading Users model...");
  Users = UsersFactory(sequelize, DataTypes);
  console.log("Users model loaded");
} catch (err) {
  console.error("Failed to load Users model:", err.message);
}

try {
  console.log("Loading State model...");
  State = StateFactory(sequelize, DataTypes);
  console.log("State model loaded");
} catch (err) {
  console.error("Failed to load State model:", err.message);
}

try {
  console.log("Loading City model...");
  City = CityFactory(sequelize, DataTypes);
  console.log("City model loaded");
} catch (err) {
  console.error("Failed to load City model:", err.message);
}

try {
  console.log("Loading CityTierMaster model...");
  CityTierMaster = CityTierMasterFactory(sequelize, DataTypes);
  console.log("CityTierMaster model loaded");
} catch (err) {
  console.error("Failed to load CityTierMaster model:", err.message);
}

try {
  console.log("Loading Pincode model...");
  Pincode = PincodeFactory(sequelize, DataTypes);
  console.log("Pincode model loaded");
} catch (err) {
  console.error("Failed to load Pincode model:", err.message);
}

try {
  console.log("Loading ProductGroup model...");
  ProductGroup = ProductGroupFactory(sequelize, DataTypes);
  console.log("ProductGroup model loaded");
} catch (err) {
  console.error("Failed to load ProductGroup model:", err.message);
}

try {
  console.log("Loading ProductModel model...");
  ProductModel = ProductModelFactory(sequelize, DataTypes);
  console.log("ProductModel model loaded");
} catch (err) {
  console.error("Failed to load ProductModel model:", err.message);
}

try {
  console.log("Loading SparePart model...");
  SparePart = SparePartFactory(sequelize, DataTypes);
  console.log("SparePart model loaded");
} catch (err) {
  console.error("Failed to load SparePart model:", err.message);
}

try {
  console.log("Loading SparePartMSL model...");
  SparePartMSL = SparePartMSLFactory(sequelize, DataTypes);
  console.log("SparePartMSL model loaded");
} catch (err) {
  console.error("Failed to load SparePartMSL model:", err.message);
}

try {
  console.log("Loading SpareRequest model...");
  SpareRequest = SpareRequestFactory(sequelize, DataTypes);
  console.log("SpareRequest model loaded");
} catch (err) {
  console.error("Failed to load SpareRequest model:", err.message);
}

try {
  console.log("Loading SpareRequestItem model...");
  SpareRequestItem = SpareRequestItemFactory(sequelize, DataTypes);
  console.log("SpareRequestItem model loaded");
} catch (err) {
  console.error("Failed to load SpareRequestItem model:", err.message);
}

try {
  console.log("Loading Roles model...");
  Roles = RolesFactory(sequelize, DataTypes);
  console.log("Roles model loaded");
} catch (err) {
  console.error("Failed to load Roles model:", err.message);
}

try {
  console.log("Loading AccessControl model...");
  AccessControl = AccessControlFactory(sequelize, DataTypes);
  console.log("AccessControl model loaded");
} catch (err) {
  console.error("Failed to load AccessControl model:", err.message);
}

try {
  console.log("Loading Dealers model...");
  Dealers = DealersFactory(sequelize, DataTypes);
  console.log("Dealers model loaded");
} catch (err) {
  console.error("Failed to load Dealers model:", err.message);
}

try {
  console.log("Loading ReportingAuthority model...");
  ReportingAuthority = ReportingAuthorityFactory(sequelize, DataTypes);
  console.log("ReportingAuthority model loaded");
} catch (err) {
  console.error("Failed to load ReportingAuthority model:", err.message);
}

try {
  console.log("Loading Zones model...");
  Zones = ZonesFactory(sequelize, DataTypes);
  console.log("Zones model loaded");
} catch (err) {
  console.error("Failed to load Zones model:", err.message);
}

try {
  console.log("Loading Plant model...");
  Plant = PlantFactory(sequelize, DataTypes);
  console.log("Plant model loaded");
} catch (err) {
  console.error("Failed to load Plant model:", err.message);
}

try {
  console.log("Loading RSM model...");
  RSM = RSMFactory(sequelize, DataTypes);
  console.log("RSM model loaded");
} catch (err) {
  console.error("Failed to load RSM model:", err.message);
}

try {
  console.log("Loading CustomersProducts model...");
  CustomersProducts = CustomersProductsFactory(sequelize, DataTypes);
  console.log("CustomersProducts model loaded");
} catch (err) {
  console.error("Failed to load CustomersProducts model:", err.message);
}

// Associations will be defined AFTER all models are loaded (see line ~610)
try{
  console.log("Loading Status model...");
  Status = StatusFactory(sequelize, DataTypes);
  console.log("Status model loaded");
} catch (err) {
  console.error("Failed to load Status model:", err.message);
}

try {
  console.log("Loading SubStatus model...");
  SubStatus = SubStatusFactory(sequelize, DataTypes);
  console.log("SubStatus model loaded");
} catch (err) {
  console.error("Failed to load SubStatus model:", err.message);
}

try {
  console.log("Loading Calls model...");
  Calls = CallsFactory(sequelize, DataTypes);
  console.log("Calls model loaded");
} catch (err) {
  console.error("Failed to load Calls model:", err.message);
}

try {
  console.log("Loading CallSpareUsage model...");
  CallSpareUsage = CallSpareUsageFactory(sequelize, DataTypes);
  console.log("CallSpareUsage model loaded");
} catch (err) {
  console.error("Failed to load CallSpareUsage model:", err.message);
}

try {
  console.log("Loading Attachments model...");
  Attachments = AttachmentsFactory(sequelize, DataTypes);
  console.log("Attachments model loaded");
} catch (err) {
  console.error("Failed to load Attachments model:", err.message);
}

try {
  console.log("Loading AttachmentAccess model...");
  AttachmentAccess = AttachmentAccessFactory(sequelize, DataTypes);
  console.log("AttachmentAccess model loaded");
} catch (err) {
  console.error("Failed to load AttachmentAccess model:", err.message);
}

try {
  console.log("Loading HappyCodes model...");
  HappyCodes = HappyCodesFactory(sequelize, DataTypes);
  console.log("HappyCodes model loaded");
} catch (err) {
  console.error("Failed to load HappyCodes model:", err.message);
}

try {
  console.log("Loading TATTracking model...");
  TATTracking = TATTrackingFactory(sequelize, DataTypes);
  console.log("TATTracking model loaded");
} catch (err) {
  console.error("Failed to load TATTracking model:", err.message);
}

try {
  console.log("Loading TATHolds model...");
  TATHolds = TATHoldsFactory(sequelize, DataTypes);
  console.log("TATHolds model loaded");
} catch (err) {
  console.error("Failed to load TATHolds model:", err.message);
}

try {
  console.log("Loading ActionLog model...");
  ActionLog = ActionLogFactory(sequelize, DataTypes);
  console.log("ActionLog model loaded");
} catch (err) {
  console.error("Failed to load ActionLog model:", err.message);
}

try {
  console.log("Loading Approvals model...");
  Approvals = ApprovalsFactory(sequelize, DataTypes);
  console.log("Approvals model loaded");
} catch (err) {
  console.error("Failed to load Approvals model:", err.message);
}


try {
  console.log("Loading SpareInventory model...");
  SpareInventory = SpareInventoryFactory(sequelize, DataTypes);
  console.log("SpareInventory model loaded");
  // Add association: SpareInventory belongsTo SparePart
  if (SpareInventory && SparePart) {
    SpareInventory.belongsTo(SparePart, { foreignKey: 'spare_id', targetKey: 'Id', as: 'SparePart' });
    console.log('✅ Associated SpareInventory -> SparePart (with alias)');
  } else {
    console.warn('⚠️ Could not associate SpareInventory -> SparePart (model missing)');
  }
} catch (err) {
  console.error("Failed to load SpareInventory model:", err.message);
}

try {
  console.log("Loading StockMovement model...");
  StockMovement = StockMovementFactory(sequelize, DataTypes);
  console.log("StockMovement model loaded");
} catch (err) {
  console.error("Failed to load StockMovement model:", err.message);
}

try {
  console.log("Loading Cartons model...");
  Cartons = CartonsFactory(sequelize, DataTypes);
  console.log("Cartons model loaded");
} catch (err) {
  console.error("Failed to load Cartons model:", err.message);
}

try {
  console.log("Loading GoodsMovementItems model...");
  GoodsMovementItems = GoodsMovementItemsFactory(sequelize, DataTypes);
  console.log("GoodsMovementItems model loaded");
} catch (err) {
  console.error("Failed to load GoodsMovementItems model:", err.message);
}

try {
  console.log("Loading ServiceCenter model...");
  ServiceCenter = ServiceCenterFactory(sequelize, DataTypes);
  console.log("ServiceCenter model loaded");
} catch (err) {
  console.error("Failed to load ServiceCenter model:", err.message);
}

try {
  console.log("Loading Technicians model...");
  Technicians = TechniciansFactory(sequelize, DataTypes);
  console.log("Technicians model loaded");
} catch (err) {
  console.error("Failed to load Technicians model:", err.message);
}

try {
  console.log("Loading CallTechnicianAssignment model...");
  CallTechnicianAssignment = CallTechnicianAssignmentFactory(sequelize, DataTypes);
  console.log("CallTechnicianAssignment model loaded");
} catch (err) {
  console.error("Failed to load CallTechnicianAssignment model:", err.message);
}

try {
  console.log("Loading CallCancellationRequests model...");
  CallCancellationRequests = CallCancellationRequestsFactory(sequelize, DataTypes);
  console.log("CallCancellationRequests model loaded");
} catch (err) {
  console.error("Failed to load CallCancellationRequests model:", err.message);
}

try {
  console.log("Loading LogisticsDocuments model...");
  LogisticsDocuments = LogisticsDocumentsFactory(sequelize);
  console.log("LogisticsDocuments model loaded");
} catch (err) {
  console.error("Failed to load LogisticsDocuments model:", err.message);
}

try {
  console.log("Loading LogisticsDocumentItems model...");
  LogisticsDocumentItems = LogisticsDocumentItemsFactory(sequelize);
  console.log("LogisticsDocumentItems model loaded");
} catch (err) {
  console.error("Failed to load LogisticsDocumentItems model:", err.message);
}

try {
  console.log("Loading ServiceInvoice model...");
  ServiceInvoice = ServiceInvoiceFactory(sequelize);
  console.log("ServiceInvoice model loaded");
} catch (err) {
  console.error("Failed to load ServiceInvoice model:", err.message);
}

try {
  console.log("Loading ServiceInvoiceItem model...");
  ServiceInvoiceItem = ServiceInvoiceItemFactory(sequelize);
  console.log("ServiceInvoiceItem model loaded");
} catch (err) {
  console.error("Failed to load ServiceInvoiceItem model:", err.message);
}

try {
  console.log("Loading DefectMaster model...");
  DefectMaster = DefectMasterFactory(sequelize);
  console.log("DefectMaster model loaded");
} catch (err) {
  console.error("Failed to load DefectMaster model:", err.message);
}

try {
  console.log("Loading DefectSpares model...");
  DefectSpares = DefectSparesFactory(sequelize);
  console.log("DefectSpares model loaded");
} catch (err) {
  console.error("Failed to load DefectSpares model:", err.message);
}

try {
  console.log("Loading ModelDefects model...");
  ModelDefects = ModelDefectsFactory(sequelize);
  console.log("ModelDefects model loaded");
} catch (err) {
  console.error("Failed to load ModelDefects model:", err.message);
}

try {
  console.log("Loading EntityChangeRequests model...");
  EntityChangeRequests = EntityChangeRequestsFactory(sequelize);
  console.log("EntityChangeRequests model loaded");
} catch (err) {
  console.error("Failed to load EntityChangeRequests model:", err.message);
}

try {
  console.log("Loading Ledger model...");
  Ledger = LedgerFactory(sequelize);
  console.log("Ledger model loaded");
} catch (err) {
  console.error("Failed to load Ledger model:", err.message);
}

try {
  console.log("Loading Replacements model...");
  Replacements = ReplacementsFactory(sequelize);
  console.log("Replacements model loaded");
} catch (err) {
  console.error("Failed to load Replacements model:", err.message);
}

try {
  console.log("Loading Reimbursement model...");
  Reimbursement = ReimbursementFactory(sequelize);
  console.log("Reimbursement model loaded");
} catch (err) {
  console.error("Failed to load Reimbursement model:", err.message);
}

try {
  console.log("Loading RSMStateMapping model...");
  RSMStateMapping = RSMStateMappingFactory(sequelize);
  console.log("RSMStateMapping model loaded");
} catch (err) {
  console.error("Failed to load RSMStateMapping model:", err.message);
}

try {
  console.log("Loading SAPDocuments model...");
  SAPDocuments = SAPDocumentsFactory(sequelize);
  console.log("SAPDocuments model loaded");
} catch (err) {
  console.error("Failed to load SAPDocuments model:", err.message);
}

try {
  console.log("Loading SAPDocumentItems model...");
  SAPDocumentItems = SAPDocumentItemsFactory(sequelize);
  console.log("SAPDocumentItems model loaded");
} catch (err) {
  console.error("Failed to load SAPDocumentItems model:", err.message);
}

try {
  console.log("Loading ServiceCenterFinancial model...");
  ServiceCenterFinancial = ServiceCenterFinancialFactory(sequelize);
  console.log("ServiceCenterFinancial model loaded");
} catch (err) {
  console.error("Failed to load ServiceCenterFinancial model:", err.message);
}

try {
  console.log("Loading ServiceCenterPincodes model...");
  ServiceCenterPincodes = ServiceCenterPincodesFactory(sequelize);
  console.log("ServiceCenterPincodes model loaded");
} catch (err) {
  console.error("Failed to load ServiceCenterPincodes model:", err.message);
}

// --- REGISTER ALL MODELS IN sequelize.models ---
console.log("📝 Registering models in sequelize.models...");
const modelsToRegister = {
  Customer,
  ProductMaster,
  Users,
  State,
  City,
  CityTierMaster,
  Pincode,
  ProductGroup,
  ProductModel,
  SparePart,
  SparePartMSL,
  SpareRequest,
  SpareRequestItem,
  Roles,
  AccessControl,
  Dealers,
  ReportingAuthority,
  Zones,
  Plant,
  RSM,
  CustomersProducts,
  Status,
  SubStatus,
  Calls,
  CallSpareUsage,
  Attachments,
  AttachmentAccess,
  HappyCodes,
  TATTracking,
  TATHolds,
  ActionLog,
  Approvals,
  SpareInventory,
  StockMovement,
  Cartons,
  GoodsMovementItems,
  ServiceCenter,
  Technicians,
  CallTechnicianAssignment,
  CallCancellationRequests,
  LogisticsDocuments,
  LogisticsDocumentItems,
  ServiceInvoice,
  ServiceInvoiceItem,
  DefectMaster,
  DefectSpares,
  ModelDefects,
  EntityChangeRequests,
  Ledger,
  Replacements,
  Reimbursement,
  RSMStateMapping,
  SAPDocuments,
  SAPDocumentItems,
  ServiceCenterFinancial,
  ServiceCenterPincodes
};

let registeredCount = 0;
for (const [name, model] of Object.entries(modelsToRegister)) {
  if (model) {
    sequelize.models[name] = model;
    registeredCount++;
  }
}
console.log(`✅ Registered ${registeredCount} models in sequelize.models`);

// --- NOW Define associations (after all models are loaded) ---
try {
  if (CustomersProducts && ProductMaster) {
    // CustomersProducts -> ProductMaster (alias as `Product` for controllers)
    CustomersProducts.belongsTo(ProductMaster, {
      foreignKey: 'product_id',
      targetKey: 'ID',
      as: 'Product',
    });

    ProductMaster.hasMany(CustomersProducts, {
      foreignKey: 'product_id',
      sourceKey: 'ID',
      as: 'CustomersProducts',
    });
  }

  if (CustomersProducts && ProductModel) {
    CustomersProducts.belongsTo(ProductModel, {
      foreignKey: 'model_id',
      targetKey: 'Id',
      as: 'ProductModel',
    });
  }

  if (CustomersProducts && Customer) {
    CustomersProducts.belongsTo(Customer, {
      foreignKey: 'customer_id',
      targetKey: 'customer_id',
      as: 'Customer',
    });
    Customer.hasMany(CustomersProducts, {
      foreignKey: 'customer_id',
      sourceKey: 'customer_id',
      as: 'Products',
    });
  }

  if (Users && Roles) {
    Users.belongsTo(Roles, {
      foreignKey: 'role_id',
      as: 'role',
    });
    Roles.hasMany(Users, {
      foreignKey: 'role_id',
      as: 'users',
    });
  }

  // RSM associations
  if (RSM && Users) {
    RSM.belongsTo(Users, {
      foreignKey: 'user_id',
      targetKey: 'user_id',
      as: 'user',
    });

    Users.hasMany(RSM, {
      foreignKey: 'user_id',
      sourceKey: 'user_id',
      as: 'rsms',
    });
  }

  if (RSM && Roles) {
    RSM.belongsTo(Roles, {
      foreignKey: 'role_id',
      targetKey: 'roles_id',
      as: 'role',
    });

    Roles.hasMany(RSM, {
      foreignKey: 'role_id',
      sourceKey: 'roles_id',
      as: 'rsms',
    });
  }

  if (Users && ServiceCenter) {
    // One Users has one ServiceCenter
    Users.hasOne(ServiceCenter, {
      foreignKey: 'user_id',
      as: 'serviceCenter',
    });

    // One ServiceCenter belongs to one Users
    ServiceCenter.belongsTo(Users, {
      foreignKey: 'user_id',
      as: 'user',
    });
  }

  if (Calls && Customer) {
    // Calls belongs to Customer
    Calls.belongsTo(Customer, {
      foreignKey: 'customer_id',
      as: 'customer',
      constraints: false,
    });

    // Customer has many Calls
    Customer.hasMany(Calls, {
      foreignKey: 'customer_id',
      as: 'calls',
      constraints: false,
    });
  }

  if (Calls && ServiceCenter) {
    // Calls belongs to ServiceCenter (assigned_asc_id)
    Calls.belongsTo(ServiceCenter, {
      foreignKey: 'assigned_asc_id',
      as: 'serviceCenter',
      constraints: false,
    });

    // ServiceCenter has many Calls
    ServiceCenter.hasMany(Calls, {
      foreignKey: 'assigned_asc_id',
      as: 'assignedComplaints',
      constraints: false,
    });
  }

  if (ServiceCenterPincodes && ServiceCenter) {
    // ServiceCenterPincodes belongs to ServiceCenter
    ServiceCenterPincodes.belongsTo(ServiceCenter, {
      foreignKey: 'asc_id',
      as: 'serviceCenter',
    });

    // ServiceCenter has many ServiceCenterPincodes
    ServiceCenter.hasMany(ServiceCenterPincodes, {
      foreignKey: 'asc_id',
      as: 'pincodes',
    });
  }

  if (Technicians && ServiceCenter) {
    // Technicians belongs to ServiceCenter
    Technicians.belongsTo(ServiceCenter, {
      foreignKey: 'service_center_id',
      targetKey: 'asc_id',
      as: 'serviceCenter',
    });

    // ServiceCenter has many Technicians
    ServiceCenter.hasMany(Technicians, {
      foreignKey: 'service_center_id',
      sourceKey: 'asc_id',
      as: 'technicians',
    });
  }

  if (Calls && Status) {
    // Calls belongs to Status
    Calls.belongsTo(Status, {
      foreignKey: 'status_id',
      as: 'status',
      constraints: false,
    });

    // Status has many Calls
    Status.hasMany(Calls, {
      foreignKey: 'status_id',
      as: 'complaints',
      constraints: false,
    });
  }

  if (Calls && SubStatus) {
    // Calls belongs to SubStatus
    Calls.belongsTo(SubStatus, {
      foreignKey: 'sub_status_id',
      as: 'subStatus',
      constraints: false,
    });

    // SubStatus has many Calls
    SubStatus.hasMany(Calls, {
      foreignKey: 'sub_status_id',
      as: 'calls',
      constraints: false,
    });
  }

  if (Calls && CustomersProducts) {
    // Calls belongs to CustomersProducts
    Calls.belongsTo(CustomersProducts, {
      foreignKey: 'customer_product_id',
      targetKey: 'customers_products_id',
      as: 'customer_product',
      constraints: false,
    });

    // CustomersProducts has many Calls
    CustomersProducts.hasMany(Calls, {
      foreignKey: 'customer_product_id',
      sourceKey: 'customers_products_id',
      as: 'calls',
      constraints: false,
    });
  }

  if (Calls && Technicians) {
    // Calls belongs to Technicians (assigned technician)
    Calls.belongsTo(Technicians, {
      foreignKey: 'assigned_tech_id',
      targetKey: 'technician_id',
      as: 'technician',
      constraints: false,
    });

    // Technicians has many Calls (as assigned technician)
    Technicians.hasMany(Calls, {
      foreignKey: 'assigned_tech_id',
      sourceKey: 'technician_id',
      as: 'assignedCalls',
      constraints: false,
    });
  }

  if (Calls && Users) {
    // Calls belongs to Users (assigned service center - kept for legacy compatibility)
    Calls.belongsTo(Users, {
      foreignKey: 'assigned_asc_id',
      targetKey: 'user_id',
      as: 'assignedServiceCenter',
      constraints: false,
    });

    // Users has many Calls (as assigned service center)
    Users.hasMany(Calls, {
      foreignKey: 'assigned_asc_id',
      sourceKey: 'user_id',
      as: 'assignedServiceCenterCalls',
      constraints: false,
    });
  }

  // Product hierarchy associations: ProductGroup → ProductMaster → ProductModel → SparePart
  if (ProductGroup && ProductMaster) {
    // ProductMaster belongs to ProductGroup
    ProductMaster.belongsTo(ProductGroup, {
      foreignKey: 'ProductGroupID',
      targetKey: 'Id',
      as: 'productGroup',
    });

    // ProductGroup has many ProductMasters
    ProductGroup.hasMany(ProductMaster, {
      foreignKey: 'ProductGroupID',
      sourceKey: 'Id',
      as: 'productMasters',
    });
  }

  if (ProductMaster && ProductModel) {
    // ProductModel belongs to ProductMaster
    ProductModel.belongsTo(ProductMaster, {
      foreignKey: 'ProductID',
      targetKey: 'ID',
      as: 'productMaster',
    });

    // ProductMaster has many ProductModels
    ProductMaster.hasMany(ProductModel, {
      foreignKey: 'ProductID',
      sourceKey: 'ID',
      as: 'productModels',
    });
  }

  if (ProductModel && SparePart) {
    // SparePart belongs to ProductModel
    SparePart.belongsTo(ProductModel, {
      foreignKey: 'ModelID',
      targetKey: 'Id',
      as: 'productModel',
    });

    // ProductModel has many SpareParts
    ProductModel.hasMany(SparePart, {
      foreignKey: 'ModelID',
      sourceKey: 'Id',
      as: 'spareParts',
    });
  }

  // RSM ↔ State via RSMStateMapping
  if (RSM && RSMStateMapping && State) {
    // RSM has many mappings where mapping.rsm_user_id corresponds to RSM.user_id
    RSM.hasMany(RSMStateMapping, {
      foreignKey: 'rsm_user_id',
      sourceKey: 'user_id',
      as: 'stateMappings',
    });

    // Expose states through the mapping table
    RSM.belongsToMany(State, {
      through: RSMStateMapping,
      foreignKey: 'rsm_user_id',
      otherKey: 'state_id',
      as: 'states',
    });

    State.belongsToMany(RSM, {
      through: RSMStateMapping,
      foreignKey: 'state_id',
      otherKey: 'rsm_user_id',
      as: 'rsms',
    });
  }

  // SpareRequest - SpareRequestItem Association
  if (SpareRequest && SpareRequestItem) {
    // SpareRequestItem belongs to SpareRequest
    SpareRequestItem.belongsTo(SpareRequest, {
      foreignKey: 'request_id',
      targetKey: 'request_id',
      as: 'request',
      constraints: false,
    });

    // SpareRequest has many SpareRequestItems
    SpareRequest.hasMany(SpareRequestItem, {
      foreignKey: 'request_id',
      sourceKey: 'request_id',
      as: 'SpareRequestItems',
      constraints: false,
    });
  }

  // SpareRequest - Calls Association (for technician requests)
  if (SpareRequest && Calls) {
    SpareRequest.belongsTo(Calls, {
      foreignKey: 'call_id',
      targetKey: 'call_id',
      as: 'Call',
      constraints: false,
    });

    Calls.hasMany(SpareRequest, {
      foreignKey: 'call_id',
      sourceKey: 'call_id',
      as: 'SpareRequests',
      constraints: false,
    });
  }

  // SpareRequest - Technicians Association
  if (SpareRequest && Technicians) {
    SpareRequest.belongsTo(Technicians, {
      foreignKey: 'requested_source_id',
      targetKey: 'technician_id',
      constraints: false,
      as: 'Technician',
      scope: {
        requested_source_type: 'technician'
      }
    });

    Technicians.hasMany(SpareRequest, {
      foreignKey: 'requested_source_id',
      sourceKey: 'technician_id',
      constraints: false,
      as: 'SpareRequests',
      scope: {
        requested_source_type: 'technician'
      }
    });
  }

  // SpareRequest - Status Association
  if (SpareRequest && Status) {
    SpareRequest.belongsTo(Status, {
      foreignKey: 'status_id',
      targetKey: 'status_id',
      as: 'status',
      constraints: false,
    });

    Status.hasMany(SpareRequest, {
      foreignKey: 'status_id',
      sourceKey: 'status_id',
      as: 'SpareRequests',
      constraints: false,
    });
  }

  // StockMovement - SparePart Association removed
  // (SparePart is accessed through GoodsMovementItems, not directly)
  // StockMovement does NOT have a spare_id column

  // SpareRequestItem - SparePart Association
  if (SpareRequestItem && SparePart) {
    // SpareRequestItem belongs to SparePart
    SpareRequestItem.belongsTo(SparePart, {
      foreignKey: 'spare_id',
      targetKey: 'Id',
      as: 'SparePart',
      constraints: false,
    });
  }

  // CallSpareUsage - SparePart Association
  if (CallSpareUsage && SparePart) {
    // CallSpareUsage belongs to SparePart
    CallSpareUsage.belongsTo(SparePart, {
      foreignKey: 'spare_part_id',
      targetKey: 'Id',
      as: 'SparePart',
      constraints: false,
    });
  }

  // LogisticsDocuments - LogisticsDocumentItems Association
  if (LogisticsDocuments && LogisticsDocumentItems) {
    // LogisticsDocumentItems belongs to LogisticsDocuments
    LogisticsDocumentItems.belongsTo(LogisticsDocuments, {
      foreignKey: 'document_id',
      targetKey: 'id',
      as: 'LogisticsDocument',
    });

    // LogisticsDocuments has many LogisticsDocumentItems
    LogisticsDocuments.hasMany(LogisticsDocumentItems, {
      foreignKey: 'document_id',
      sourceKey: 'id',
      as: 'items',
    });
  }

  // LogisticsDocumentItems - SparePart Association
  if (LogisticsDocumentItems && SparePart) {
    LogisticsDocumentItems.belongsTo(SparePart, {
      foreignKey: 'spare_part_id',
      targetKey: 'Id',
      as: 'SparePart',
    });
  }

  // StockMovement - GoodsMovementItems Association
  if (StockMovement && GoodsMovementItems) {
    // GoodsMovementItems belongs to StockMovement
    GoodsMovementItems.belongsTo(StockMovement, {
      foreignKey: 'movement_id',
      targetKey: 'movement_id',
      as: 'StockMovement',
    });

    // StockMovement has many GoodsMovementItems
    StockMovement.hasMany(GoodsMovementItems, {
      foreignKey: 'movement_id',
      sourceKey: 'movement_id',
      as: 'goods_items',
    });
  }

  // StockMovement - Cartons Association
  if (StockMovement && Cartons) {
    // Cartons belongs to StockMovement
    Cartons.belongsTo(StockMovement, {
      foreignKey: 'movement_id',
      targetKey: 'movement_id',
      as: 'StockMovement',
    });

    // StockMovement has many Cartons
    StockMovement.hasMany(Cartons, {
      foreignKey: 'movement_id',
      sourceKey: 'movement_id',
      as: 'cartons',
    });
  }

  // Cartons - GoodsMovementItems Association
  if (Cartons && GoodsMovementItems) {
    // GoodsMovementItems belongs to Cartons
    GoodsMovementItems.belongsTo(Cartons, {
      foreignKey: 'carton_id',
      targetKey: 'carton_id',
      as: 'carton',
    });

    // Cartons has many GoodsMovementItems
    Cartons.hasMany(GoodsMovementItems, {
      foreignKey: 'carton_id',
      sourceKey: 'carton_id',
      as: 'goods_items',
    });
  }

  // GoodsMovementItems - SparePart Association
  if (GoodsMovementItems && SparePart) {
    // GoodsMovementItems belongs to SparePart
    GoodsMovementItems.belongsTo(SparePart, {
      foreignKey: 'spare_part_id',
      targetKey: 'Id',
      as: 'SparePart',
    });

    // SparePart has many GoodsMovementItems
    SparePart.hasMany(GoodsMovementItems, {
      foreignKey: 'spare_part_id',
      sourceKey: 'Id',
      as: 'goodsMovementItems',
    });
  }

  // TechnicianSpareReturnItem - SparePart Association
  if (TechnicianSpareReturnItem && SparePart) {
    // TechnicianSpareReturnItem belongs to SparePart
    TechnicianSpareReturnItem.belongsTo(SparePart, {
      foreignKey: 'spare_id',
      targetKey: 'Id',
      as: 'spare',
    });
  }

  // TechnicianSpareReturn - Technicians Association
  if (TechnicianSpareReturn && Technicians) {
    // TechnicianSpareReturn belongs to Technicians
    TechnicianSpareReturn.belongsTo(Technicians, {
      foreignKey: 'technician_id',
      targetKey: 'technician_id',
      as: 'technician',
    });

    // Technicians has many TechnicianSpareReturns
    Technicians.hasMany(TechnicianSpareReturn, {
      foreignKey: 'technician_id',
      sourceKey: 'technician_id',
      as: 'spareReturns',
    });
  }

  // TechnicianSpareReturn - ServiceCenter Association
  if (TechnicianSpareReturn && ServiceCenter) {
    // TechnicianSpareReturn belongs to ServiceCenter
    TechnicianSpareReturn.belongsTo(ServiceCenter, {
      foreignKey: 'service_center_id',
      targetKey: 'asc_id',
      as: 'serviceCenter',
    });

    // ServiceCenter has many TechnicianSpareReturns
    ServiceCenter.hasMany(TechnicianSpareReturn, {
      foreignKey: 'service_center_id',
      sourceKey: 'asc_id',
      as: 'technicianSpareReturns',
    });
  }

  console.log('✅ Associations defined: CustomersProducts <-> ProductMaster/ProductModel/Customer; Calls <-> Customer/ServiceCenter/Status/CustomersProducts/Technicians; ServiceCenterPincodes <-> ServiceCenter; Technicians <-> ServiceCenter; ProductGroup <-> ProductMaster <-> ProductModel <-> SparePart; SpareRequest <-> SpareRequestItem; SpareRequestItem <-> SparePart; LogisticsDocuments <-> LogisticsDocumentItems; StockMovement <-> GoodsMovementItems/Cartons; Cartons <-> GoodsMovementItems; GoodsMovementItems <-> SparePart; TechnicianSpareReturn <-> TechnicianSpareReturnItem <-> SparePart/Technicians/ServiceCenter');
} catch (assocErr) {
  console.error('Failed to define associations:', assocErr && assocErr.message);
}

// Validate critical models are loaded
const criticalModels = { State, City, Pincode, ProductGroup, ProductModel, SparePart };
const missingModels = Object.entries(criticalModels)
  .filter(([name, model]) => !model)
  .map(([name]) => name);

if (missingModels.length > 0) {
  console.warn(`⚠️ WARNING: Critical models not loaded: ${missingModels.join(', ')}`);
} else {
  console.log("✅ All critical models loaded successfully");
}

// Optional sync helper
export const sync = async (opts = { alter: true, force: false }) => {
  await sequelize.sync(opts);
};

export {
  sequelize,
  Customer,
  Product,
  ProductMaster,
  Users,
  State,
  City,
  CityTierMaster,
  Pincode,
  ProductGroup,
  ProductModel,
  SparePart,
  SparePartMSL,
  SpareRequest,
  SpareRequestItem,
  Roles,
  AccessControl,
  Dealers,
  ReportingAuthority,
  Zones,
  Plant,
  CustomersProducts,
  Status,
  SubStatus,
  Calls,
  CallSpareUsage,
  Attachments,
  AttachmentAccess,
  HappyCodes,
  TATTracking,
  TATHolds,
  ActionLog,
  Approvals,
  SpareInventory,
  StockMovement,
  Cartons,
  GoodsMovementItems,
  ServiceCenter,
  Technicians,
  CallTechnicianAssignment,
  CallCancellationRequests,
  LogisticsDocuments,
  LogisticsDocumentItems,
  ServiceInvoice,
  ServiceInvoiceItem,
  DefectMaster,
  DefectSpares,
  ModelDefects,
  EntityChangeRequests,
  Ledger,
  Replacements,
  Reimbursement,
  RSMStateMapping,
  RSM,
  SAPDocuments,
  SAPDocumentItems,
  ServiceCenterFinancial,
  ServiceCenterPincodes,
  // OrderRequest,
};


