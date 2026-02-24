import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const CustomersProducts = sequelize.define(
    'CustomersProducts',
    {
      customers_products_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'customers_products_id',
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'customer_id',
        // FK removed - added via ALTER TABLE
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'product_id',
        // FK removed - added via ALTER TABLE
      },
      model_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'model_id',
        // FK removed - added via ALTER TABLE
      },
      serial_no: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        field: 'serial_no',
      },
      date_of_purchase: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'date_of_purchase',
      },
      qty_with_customer: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
        field: 'qty_with_customer',
      },
      dealer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'dealer_id',
        // FK removed - added via ALTER TABLE
      },
      purchase_invoice_no: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'purchase_invoice_no',
      },
      warranty_status: {
        type: DataTypes.ENUM('active', 'expired', 'voided', 'not_applicable'),
        defaultValue: 'active',
        field: 'warranty_status',
      },
      amc_no: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'amc_no',
      },
      amc_start_date: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'amc_start_date',
      },
      amc_end_date: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'amc_end_date',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'created_by',
        // references removed temporarily to allow table creation during sync
        // references: { model: 'users', key: 'user_id' },
        // onDelete: 'SET NULL',
        // onUpdate: 'CASCADE',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'updated_by',
        // references removed temporarily to allow table creation during sync
        // references: { model: 'users', key: 'user_id' },
        // onDelete: 'SET NULL',
        // onUpdate: 'CASCADE',
      },
    },
    {
      tableName: 'customers_products',
      timestamps: false,
    }
  );

  return CustomersProducts;
};
