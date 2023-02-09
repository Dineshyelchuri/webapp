module.exports = (sequelize, DataTypes) => {
    const Product = sequelize.define("products", {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      sku: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      manufacturer: {
        type: DataTypes.STRING,
        allowNull: false,
      }, 
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 0,
            max: 100
          }
      },
      owner_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    }, {
      timestamps: true,
      createdAt: 'date_added',
      updatedAt: 'date_last_updated'
    });

    return Product;
  };
  