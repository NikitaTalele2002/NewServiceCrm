import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Calls = sequelize.define(
    'Calls',
    {
      call_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'call_id',
      },
      ref_call_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'ref_call_id',
        // FK removed to avoid circular dependency - added via ALTER TABLE
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'customer_id',
        // FK removed - added via ALTER TABLE
      },
      customer_product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'customer_product_id',
        // FK removed - added via ALTER TABLE
      },
      assigned_asc_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'assigned_asc_id',
        // FK removed - added via ALTER TABLE
      },
      assigned_tech_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'assigned_tech_id',
        // FK removed - added via ALTER TABLE
      },
      call_type: {
        type: DataTypes.ENUM('complaint', 'serviceRequest', 'followup'),
        allowNull: false,
        field: 'call_type',
      },
      call_source: {
        type: DataTypes.ENUM('phone', 'email', 'web', 'mobile_app', 'whatsapp', 'other'),
        allowNull: false,
        field: 'call_source',
      },
      caller_type: {
        type: DataTypes.ENUM('customer', 'dealer', 'technician', 'other'),
        allowNull: false,
        field: 'caller_type',
      },
      preferred_language: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'preferred_language',
      },
      caller_mobile_no: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'caller_mobile_no',
      },
      remark: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'remark',
      },
      visit_date: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'visit_date',
      },
      visit_time: {
        type: DataTypes.STRING(10),
        allowNull: true,
        field: 'visit_time',
      },
      status_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'status_id',
        // FK removed - added via ALTER TABLE
      },
      sub_status_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'sub_status_id',
        // FK removed - added via ALTER TABLE
      },
      customer_remark: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'customer_remark',
      },
      cancel_reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'cancel_reason',
      },
      cancel_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'cancel_remarks',
      },
      cancelled_by_userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'cancelled_by_userId',
        // FK removed - added via ALTER TABLE
      },
      cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'cancelled_at',
      },
      closed_by: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'closed_by',
      },
      closed_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'closed_by_user_id',
        // FK removed - added via ALTER TABLE
      },
      repair_type:
      {
        type:DataTypes.ENUM('Without Spare', 'With Spare', 'Installation', 'Stock Check'),
        allowNull:true,
        field:'repair_type',
      },
      call_closure_source: {
        type: DataTypes.ENUM('customer', 'technician', 'service_center', 'system', 'admin'),
        allowNull: true,
        field: 'call_closure_source',
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
      tableName: 'calls',
      timestamps: false,
    }
  );

  return Calls;
};
