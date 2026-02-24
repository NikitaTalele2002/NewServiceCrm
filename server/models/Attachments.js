import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Attachments = sequelize.define(
    'Attachments',
    {
      attachment_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'attachment_id',
      },
      entity_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'entity_type',
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'entity_id',
      },
      file_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
        field: 'file_url',
      },
      file_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'file_type',
      },
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'file_name',
      },
      file_category: {
        type: DataTypes.ENUM('invoice', 'receipt', 'warranty', 'image', 'document', 'video', 'audio', 'other'),
        allowNull: true,
        field: 'file_category',
      },
      file_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'file_size',
      },
      checksum_hash: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'checksum_hash',
      },
      uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'uploaded_by',
        references: {
          model: 'users',
          key: 'user_id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      uploaded_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'uploaded_at',
      },
      is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_deleted',
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
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
      },
    },
    {
      tableName: 'attachments',
      timestamps: false,
    }
  );

  return Attachments;
};
