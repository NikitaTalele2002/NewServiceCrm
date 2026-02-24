import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ServiceInvoiceItem = sequelize.define(
    'ServiceInvoiceItem',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
      },
      invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'invoice_id',
        // FK removed - added via ALTER TABLE
      },
      item_type: {
        type: DataTypes.ENUM('Service', 'Spare-Parts', 'Labour', 'Miscellaneous'),
        allowNull: false,
        field: 'item_type',
      },
      part_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'part_code',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'description',
      },
      hsn_sac_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'hsn_sac_code',
      },
      qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'qty',
      },
      unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'unit_price',
      },
      line_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        field: 'line_amount',
      },
      tax_percent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'tax_percent',
      },
      tax_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'tax_amount',
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
      },
    },
    {
      tableName: 'service_invoice_items',
      timestamps: false,
      underscored: true,
    }
  );

  return ServiceInvoiceItem;
};
