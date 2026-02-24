import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ServiceInvoice = sequelize.define(
    'ServiceInvoice',
    {
      invoice_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'invoice_id',
      },
      invoice_no: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'invoice_no',
      },
      call_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'call_id',
        // FK removed - added via ALTER TABLE
      },
      asc_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'asc_id',
        // FK removed - added via ALTER TABLE
      },
      technician_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'technician_id',
        // FK removed - added via ALTER TABLE
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'customer_id',
        // FK removed - added via ALTER TABLE
      },
      invoice_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'invoice_date',
      },
      invoice_status: {
        type: DataTypes.ENUM('Draft', 'Generated', 'Sent', 'Paid', 'Partial-Paid', 'Overdue', 'Cancelled'),
        defaultValue: 'Draft',
        field: 'invoice_status',
      },
      invoice_type: {
        type: DataTypes.ENUM('Service', 'Spare-Parts', 'Labour', 'Mixed'),
        allowNull: false,
        field: 'invoice_type',
      },
      subtotal_amount: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        field: 'subtotal_amount',
      },
      tax_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'tax_amount',
      },
      discount_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'discount_amount',
      },
      total_amount: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        field: 'total_amount',
      },
      payment_mode: {
        type: DataTypes.ENUM('Cash', 'Credit-Card', 'Debit-Card', 'UPI', 'Bank-Transfer', 'Cheque', 'Other'),
        allowNull: true,
        field: 'payment_mode',
      },
      payment_status: {
        type: DataTypes.ENUM('Pending', 'Partial-Paid', 'Paid', 'Failed'),
        defaultValue: 'Pending',
        field: 'payment_status',
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
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
      },
    },
    {
      tableName: 'service_invoices',
      timestamps: false,
      underscored: true,
    }
  );

  return ServiceInvoice;
};
