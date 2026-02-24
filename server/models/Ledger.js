import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Ledger = sequelize.define(
    'Ledger',
    {
      ledger_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'ledger_id',
      },
      asc_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'asc_id',
        // FK removed - added via ALTER TABLE
      },
      transaction_type: {
        type: DataTypes.ENUM('debit', 'credit'),
        allowNull: false,
        field: 'transaction_type',
      },
      transaction_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'transaction_date',
      },
      reference_type: {
        type: DataTypes.ENUM('spare_request', 'reimbursement', 'payment', 'adjustment', 'security_deposit'),
        allowNull: true,
        field: 'reference_type',
      },
      reference_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'reference_id',
      },
      debit_amount: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        field: 'debit_amount',
      },
      credit_amount: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        field: 'credit_amount',
      },
      opening_balance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: 'opening_balance',
      },
      closing_balance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: 'closing_balance',
      },
      is_reversed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_reversed',
      },
      reversal_ref_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'reversal_ref_id',
        // FK removed to avoid circular dependency - added via ALTER TABLE
      },
      reversal_reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'reversal_reason',
      },
      reversed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'reversed_at',
      },
      reversed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'reversed_by',
        // FK removed - added via ALTER TABLE
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'remarks',
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
        // FK removed - added via ALTER TABLE
      },
    },
    {
      tableName: 'ledger',
      timestamps: false,
    }
  );

  return Ledger;
};
