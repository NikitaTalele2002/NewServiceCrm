import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const HappyCodes = sequelize.define(
    'HappyCodes',
    {
      happy_code_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'happy_code_id',
      },
      call_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: 'call_id',
        // FK removed - added via ALTER TABLE
      },
      code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'code',
      },
      status: {
        type: DataTypes.ENUM('pending', 'validated', 'expired'),
        defaultValue: 'pending',
        field: 'status',
      },
      generated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'generated_at',
      },
      used_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'used_at',
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'expires_at',
      },
      attempts_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'attempts_count',
      },
      validated_by_user: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'validated_by_user',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      resend_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'resend_count',
      },
      last_resend_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_resend_at',
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
      tableName: 'happy_codes',
      timestamps: false,
    }
  );

  return HappyCodes;
};
