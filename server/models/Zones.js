import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Zones = sequelize.define(
    'Zones',
    {
      zone_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'zone_id',
      },
      zone_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        field: 'zone_name',
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
      tableName: 'zones',
      timestamps: false,
    }
  );

  return Zones;
};
