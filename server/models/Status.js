import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Status = sequelize.define(
    'Status',
    {
      status_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'status_id',
      },
      status_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'status_name',
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
      tableName: 'status',
      timestamps: false,
    }
  );

  return Status;
};
