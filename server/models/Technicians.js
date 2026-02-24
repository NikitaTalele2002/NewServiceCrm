import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Technicians = sequelize.define(
    'Technicians',
    {
      technician_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'technician_id',
      },
      service_center_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'service_center_id',
        // FK removed - added via ALTER TABLE
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        // FK removed - added via ALTER TABLE
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        field: 'name',
      },
      mobile_no: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        field: 'mobile_no',
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'email',
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'on_leave', 'suspended'),
        defaultValue: 'active',
        field: 'status',
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
      tableName: 'technicians',
      timestamps: false,
    }
  );

  return Technicians;
};
