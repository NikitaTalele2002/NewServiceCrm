import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const SubStatus = sequelize.define(
    'SubStatus',
    {
      sub_status_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'sub_status_id',
      },
      status_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'status_id',
        references: {
            model: 'Status',
          key: 'status_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      sub_status_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'sub_status_name',
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
      tableName: 'sub_status',
      timestamps: false,
    }
  );

  return SubStatus;
};
