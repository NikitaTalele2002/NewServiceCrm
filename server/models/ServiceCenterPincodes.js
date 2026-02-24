import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const ServiceCenterPincodes = sequelize.define(
    'ServiceCenterPincodes',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'id',
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
      serviceable_pincode: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: 'serviceable_pincode',
      },
      location_type: {
        type: DataTypes.ENUM('local', 'out_city'),
        defaultValue: 'local',
        field: 'location_type',
      },
      two_way_distance: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'two_way_distance',
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
      tableName: 'service_center_pincodes',
      timestamps: false,
    }
  );

  return ServiceCenterPincodes;
};