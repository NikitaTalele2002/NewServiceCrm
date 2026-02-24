import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Reimbursement = sequelize.define(
    'Reimbursement',
    {
      claim_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'claim_id',
      },
      asc_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'asc_id',
        references: {
          model: 'service_centers',
          key: 'asc_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      plant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'plant_id',
        references: {
          model: 'plants',
          key: 'plant_id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      },
      tax_invoice_number: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'tax_invoice_number',
      },
      tax_invoice_date: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'tax_invoice_date',
      },
      tax_invoice_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        field: 'tax_invoice_amount',
      },
      total_approved_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: 'total_approved_amount',
      },
      taxable_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: 'taxable_amount',
      },
      cgst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'cgst_amount',
      },
      sgst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'sgst_amount',
      },
      igst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'igst_amount',
      },
      gst_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        field: 'gst_percentage',
      },
      reimbursement_month: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'reimbursement_month',
      },
      reimbursement_year: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'reimbursement_year',
      },
      status: {
        type: DataTypes.ENUM('draft', 'submitted', 'approved', 'rejected', 'paid'),
        defaultValue: 'draft',
        field: 'status',
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'submitted_at',
      },
      remark: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'remark',
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
      tableName: 'reimbursement',
      timestamps: false,
    }
  );

  return Reimbursement;
};
