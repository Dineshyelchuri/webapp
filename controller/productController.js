const db = require("../model");
const bcrypt = require("bcrypt");
const { products } = require("../model");
const isEmail = require("./userController");
const imageController = require("./imageController");
const AWS = require("aws-sdk");
const winston = require("winston");
const statsd = require("node-statsd");



const Product = db.products;
const User = db.users;
const Image = db.images;

const awsBucketName = process.env.AWS_BUCKET_NAME;

const s3 = new AWS.S3({
  
  //accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  //secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  //region: "us-east-1",
  region: process.env.aws_region,
});

// const logger = winston.createLogger({
//   // level: 'info', // Set the logging level
//   format: winston.format.json(), // Set the log format to JSON
//   transports: [
//     new winston.transports.Console(), // Log to the console
//     new winston.transports.File({ filename: /logs/webapp_user_stories.log }) // Log to a file
//   ]
// });

const path = require('path');

const logsFolder = path.join(__dirname, '../logs');

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(logsFolder, 'csye6225.log') })
  ]
});

logger.log('info', 'This is an informational message.');

//new statsd setup

const statsdClient=new statsd(
  {host: 'localhost',
  port: 8125}
)


const addproduct = async (req, res) => {
  statsdClient.increment('POST.addproduct.count');
  logger.log('info', 'Request received: statsd added for addproduct API end point');
  let authorizationSuccess = false;
  let userDetails = "";
  let authheader = req.headers.authorization;
  if (!authheader) {
    logger.log('error', 'Authorization header not found for addproduct API end point');
    res.status(401).send("Unauthorized");
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail.isEmail(username)) {
      logger.log('error', 'Invalid email address provided for addproduct API end point');
      res.status(401).send("Authentication Failed, Please enter a valid email");
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        logger.log('warn', 'User not found in database for addproduct API end point');
        console.log("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          logger.log('error', 'Error while comparing password', err);
          if (err) throw err;
          authorizationSuccess = result;
          if (authorizationSuccess) {
            logger.log('info', 'User successfully authorized for addproduct API end point');
            console.log("Authorization Successful!");
            const allowedParams = [
              "name",
              "description",
              "sku",
              "manufacturer",
              "quantity",
            ];
            const receivedParams = Object.keys(req.body);
            const unwantedParams = receivedParams.filter(
              (param) => !allowedParams.includes(param)
            );
            const notReceivedParams = allowedParams.filter(
              (param) => !receivedParams.includes(param)
            );

            if (unwantedParams.length) {
              logger.log('error','The following parameters are not allowed : ${unwantedParams.join(", ")}');
              res.status(400).send({
                error: `The following parameters are not allowed: ${unwantedParams.join(
                  ", "
                )}`,
              });
            } else if (notReceivedParams.length) {
              logger.log('error', `The following required parameters are not received: ${notReceivedParams.join(", ")}`);
              res.status(400).send({
                error: `The following required parameters are not received: ${notReceivedParams.join(
                  ", "
                )}`,
              });
            } else {
              const name = req.body.name;
              const description = req.body.description;
              const sku = req.body.sku;
              const manufacturer = req.body.manufacturer;
              const quantity = req.body.quantity;
              if (name == undefined || name == null || name == "") {
                logger.log('error', 'Product Name is required for addproduct API end point!');
                res.status(400).send("Product Name is required!");
              } else if (
                description == undefined ||
                description == null ||
                description == ""
              ) {
                logger.log('error', 'Product description is required for addproduct API end point!');
                res.status(400).send("Product description is required!");
              } else if (sku == undefined || sku == null) {
                logger.log('error', 'Product sku is required for addproduct API end point!');
                res.status(400).send("Product sku is required!");
              } else if (
                manufacturer == undefined ||
                manufacturer == null ||
                manufacturer == ""
              ) {
                logger.log('error', 'Product manufacturer is required for addproduct API end point!');
                res.status(400).send("Product manufacturer is required!");
              } else if (
                quantity == undefined ||
                quantity == null ||
                quantity == ""
              ) {
                logger.log('error', 'Product quantity is required for addproduct API end point!!');
                res.status(400).send("Product quantity is required!");
              } else if (
                !(typeof quantity === "number" && Number.isInteger(quantity))
              ) {
                logger.log('error', 'Product quantity needs to be Integer for addproduct API end point!!');
                res.status(400).send("Product quantity needs to be Integer!");
              } else if (quantity < 0 || quantity > 100) {
                logger.log('error', 'Product quantity needs to be between 1 to 100 for addproduct API end point!!');
                res
                  .status(400)
                  .send("Product quantity needs to be between 0 to 100!");
              } else {
                searchProduct(sku).then((productDetails) => {
                  if (productDetails) {
                    res.status(400).send("Product SKU already exists");
                  } else {
                    let newProduct = {
                      name: req.body.name,
                      description: req.body.description,
                      sku: req.body.sku,
                      manufacturer: req.body.manufacturer,
                      quantity: req.body.quantity,
                      owner_user_id: userDetails.id,
                    };
                    createProduct(newProduct).then((product) => {
                      logger.log('info','product created successfully');
                      let createdProductDetails = product.dataValues;
                      res.status(201).send({
                        id: createdProductDetails.id,
                        name: createdProductDetails.name,
                        description: createdProductDetails.description,
                        sku: createdProductDetails.sku,
                        manufacturer: createdProductDetails.manufacturer,
                        quantity: createdProductDetails.quantity,
                        date_added: createdProductDetails.date_added,
                        date_last_updated:
                          createdProductDetails.date_last_updated,
                        owner_user_id: createdProductDetails.owner_user_id,
                      });
                    });
                  }
                });
              }
            }
          } else {
            logger.log('error',"password is not matching for addproduct API end point!");
            console.log("Authentication Failed");
            res.status(401).send("Authentication Failed");
          }
        });
      }
    }
    //User Auth Check End
  }
};

const getproduct = async (req, res) => {
  statsdClient.increment('GET.getproduct.count');
  logger.log('info','getproduct APi endpoint has started');
  const productId = req.params.productId;
  const prod = await Product.findOne({ where: { id: productId } }).then(
    (prod) => {
      if (prod == null) {
        logger.log('error','Product not Found at getproduct API endpoint');
        res.status(404).send("Product Not Found");
      } else {
        logger.log('info','details of the product are shown');
        res.status(200).send({
          id: prod.id,
          name: prod.name,
          description: prod.description,
          sku: prod.sku,
          manufacturer: prod.manufacturer,
          quantity: prod.quantity,
          date_added: prod.date_added,
          date_last_updated: prod.date_last_updated,
          owner_user_id: prod.owner_user_id,
        });
      }
    }
  );
};

const patchproduct = async (req, res) => {
  statsdClient.increment('PATCH.patchproduct.count');
  logger.log('info','patchproduct API endpoint has been in use for patchproduct API endpoint');
  const productId = req.params.productId;
  let authorizationSuccess = false;
  let userDetails = "";
  let authheader = req.headers.authorization;
  if (!authheader) {
    logger.log('error','Unauthorized for patchproduct API endpoint');
    res.status(401).send("Unauthorized");
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail.isEmail(username)) {
      logger.log('error','Authentication Failed, Please enter a valid email at patchproduct API endpoint');
      res.status(401).send("Authentication Failed, Please enter a valid email");
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        logger.log('Error','User Not Found at patchproduct API endpoint');
        console.log("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          authorizationSuccess = result;
          if (authorizationSuccess) {
            logger.log('info','Authorization Successful at patchproduct API endpoint');
            console.log("Authorization Successful!");
            searchProductWithId(productId).then((product) => {
                if(product == null){
                  logger.log('error','Product not Found at patchproduct API endpoint');
                    res.status(400).send("Product Not Found");
                }
              else if (userDetails.id == product.owner_user_id) {
                //Updating Product Details
                const allowedParams = [
                  "name",
                  "description",
                  "sku",
                  "manufacturer",
                  "quantity",
                ];
                const receivedParams = Object.keys(req.body);
                const unwantedParams = receivedParams.filter(
                  (param) => !allowedParams.includes(param)
                );
                const notReceivedParams = allowedParams.filter(
                  (param) => !receivedParams.includes(param)
                );

                if (unwantedParams.length) {
                  logger.log('error',`The following parameters are not allowed at patchproduct API endpoint : ${unwantedParams.join(", ")}`);
                  res.status(400).send({
                    error: `The following parameters are not allowed: ${unwantedParams.join(
                      ", "
                    )}`,
                  });
                }
                // else if (notReceivedParams.length) {
                //   res.status(400).send({
                //     error: `The following required parameters are not received: ${notReceivedParams.join(
                //       ", "
                //     )}`,
                //   });
                // }
                else {
                  let name = req.body.name;
                  let description = req.body.description;
                  let sku = req.body.sku;
                  let manufacturer = req.body.manufacturer;
                  let quantity = req.body.quantity;
                  if (
                    receivedParams.includes("name") &&
                    (name == null || name == "")
                  ) {
                    logger.log('error','product name cannot be null at patchproduct API endpoint');
                    res.status(400).send("Product Name cannot be null!");
                  } else if (
                    receivedParams.includes("description") &&
                    (description == null || description == "")
                  ) {
                    logger.log('warn','product Description is required at patchproduct API endpoint');
                    res.status(400).send("Product description is required!");
                  } else if (
                    receivedParams.includes("sku") &&
                    (sku == "" || sku == null)
                  ) {
                    logger.log('error','Product SKU is required at patchproduct API endpoint');
                    res.status(400).send("Product sku is required!");
                  } else if (
                    receivedParams.includes("manufacturer") &&
                    (manufacturer == null || manufacturer == "")
                  ) {
                    logger.log('error','Product manufacturer is required  for patchproduct API endpoint!')
                    res.status(400).send("Product manufacturer is required!");
                  } else if (
                    receivedParams.includes("quantity") &&
                    (quantity == null || quantity == "")
                  ) {
                    res.status(400).send("Product quantity is required!");
                  } else if (
                    receivedParams.includes("quantity") &&
                    !(
                      typeof quantity === "number" && Number.isInteger(quantity)
                    )
                  ) {
                    res
                      .status(400)
                      .send("Product quantity needs to be Integer!");
                  } else if (quantity < 0 || quantity > 100) {
                    logger.log('error','Product quantity needs to be between 0to 100! at patchproduct API endpoint');
                    res
                      .status(400)
                      .send("Product quantity needs to be between 0 to 100!");
                  } else {
                    searchProductWithId(productId).then((productDetails) => {
                      if (!productDetails) {
                        res.status(403).send("Product not found");
                      } else if (
                        productDetails.owner_user_id != userDetails.id
                      ) {
                        logger.log('warn','productDetails userid doesnt match with userDetails userId at patchproduct API endpoint');
                        res.status(403).send("Forbidden");
                      } else {
                        if (name == undefined) name = productDetails.name;
                        if (description == undefined)
                          description = productDetails.description;
                        if (manufacturer == undefined)
                          manufacturer = productDetails.manufacturer;
                        if (sku == undefined) sku = productDetails.sku;
                        if (quantity == undefined)
                          quantity = productDetails.quantity;
                        let newProduct = {
                          id: productId,
                          name: name,
                          description: description,
                          sku: sku,
                          manufacturer: manufacturer,
                          quantity: quantity,
                        };
                        searchProduct(sku).then((prod) => {
                          if (prod && receivedParams.includes("sku") && prod.id!=productId) {
                            res.status(400).send("Product SKU already exists");
                          } else {
                            //Update Product Function
                            updateProduct(newProduct).then((product) => {
                              console.log("updatedProd");
                              console.log(product);
                              res.sendStatus(204);
                            });
                          }
                        });
                      }
                    });
                  }
                }
              } else {
                res.status("Forbidden").sendStatus(403);
              }
            });
          } else {
            logger.log('error','authentication failed at patchproduct API endpoint');
            console.log("Authentication Failed");
            res.status(401).send("Authentication Failed");
          }
        });
      }
    }
  }
};

const updateproduct = async (req, res) => {
  statsdClient.increment('PUT.updateproduct.count');
  logger.info('this is update product API end point')
  const productId = req.params.productId;
  let authorizationSuccess = false;
  let userDetails = "";
  let authheader = req.headers.authorization;
  if (!authheader) {
    logger.log('error','the user has been Unauthorized in updateproduct API end point');
    res.status(401).send("Unauthorized");
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail.isEmail(username)) {
      logger.log('error','Authentication Failed at update product API endpoint');
      res.status(401).send("Authentication Failed, Please enter a valid email");
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        logger.log('warn','user Not Found at update product API endpoint');
        console.log("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          authorizationSuccess = result;
          if (authorizationSuccess) {
            logger.log('info','Authorization Successful at updateproduct API endpoint!');
            console.log("Authorization Successful!");
            searchProductWithId(productId).then((product) => {
                if(product == null){
                    res.status(400).send("Product Not Found");
                }
              else if (userDetails.id == product.owner_user_id) {
                //Updating Product Details
                const allowedParams = [
                  "name",
                  "description",
                  "sku",
                  "manufacturer",
                  "quantity",
                ];
                const receivedParams = Object.keys(req.body);
                const unwantedParams = receivedParams.filter(
                  (param) => !allowedParams.includes(param)
                );
                const notReceivedParams = allowedParams.filter(
                  (param) => !receivedParams.includes(param)
                );

                if (unwantedParams.length) {
                  logger.log('error','The following parameters are not allowed in updateproduct API endpoint : ${unwantedParams.join(", ")}');
                  res.status(400).send({
                    error: `The following parameters are not allowed: ${unwantedParams.join(
                      ", "
                    )}`,
                  });
                } else if (notReceivedParams.length) {
                  res.status(400).send({
                    error: `The following required parameters are not received: ${notReceivedParams.join(
                      ", "
                    )}`,
                  });
                } else {
                  const name = req.body.name;
                  const description = req.body.description;
                  const sku = req.body.sku;
                  const manufacturer = req.body.manufacturer;
                  const quantity = req.body.quantity;
                  if (name == undefined || name == null || name == "") {
                    logger.log('error','Product Name is required at updateproduct API endpoint');
                    res.status(400).send("Product Name is required!");
                  } else if (
                    description == undefined ||
                    description == null ||
                    description == ""
                  ) {
                    res.status(400).send("Product description is required!");
                  } else if (sku == undefined || sku == null || sku == "") {
                    res.status(400).send("Product sku is required!");
                  } else if (
                    manufacturer == undefined ||
                    manufacturer == null ||
                    manufacturer == ""
                  ) {
                    res.status(400).send("Product manufacturer is required!");
                  } else if (
                    quantity == undefined ||
                    quantity == null ||
                    quantity == ""
                  ) {
                    logger.log('error','product quantity is required in updateproduct API endpoint');
                    res.status(400).send("Product quantity is required!");
                  } else if (
                    !(
                      typeof quantity === "number" && Number.isInteger(quantity)
                    )
                  ) {
                    res
                      .status(400)
                      .send("Product quantity needs to be Integer!");
                  } else if (quantity < 0 || quantity > 100) {
                    res
                      .status(400)
                      .send("Product quantity needs to be between 0 to 100!");
                  } else {
                    searchProductWithId(productId).then((productDetails) => {
                      if (!productDetails) {
                        logger.log('warn','product not found at updateproduct API endpoint');
                        res.status(403).send("Product not found");
                      } else if (
                        productDetails.owner_user_id != userDetails.id
                      ) {
                        res.status(403).send("Forbidden");
                      } else {
                        let newProduct = {
                          id: productId,
                          name: req.body.name,
                          description: req.body.description,
                          sku: req.body.sku,
                          manufacturer: req.body.manufacturer,
                          quantity: req.body.quantity,
                        };
                        searchProduct(sku).then((prod) => {
                          if (prod!=null && prod.id!=productId) {
                            res.status(400).send("Product SKU already exists");
                          } else {
                            //Update Product Function
                            updateProduct(newProduct).then((product) => {
                              console.log("updatedProd");
                              console.log(product);
                              res.sendStatus(204);
                            });
                          }
                        });
                      }
                    });
                  }
                }
              } else {
                res.status("Forbidden").sendStatus(403);
              }
            });
          } else {
            logger.log('error','Authentication is failed in UpdateProduct API end point');
            console.log("Authentication Failed");
            res.status(401).send("Authentication Failed");
          }
        });
      }
    }
  }
};

const deleteproduct = async (req, res) => {
  statsdClient.increment('DELETE.deleteproduct.count');
  logger.info('welcome to delete product API endpoint');
  let pId = req.params.productId;
  let userDetails = "";
  let authheader = req.headers.authorization;
  if (!authheader) {
    logger.log('error','user has unauthorized at deleteproduct API endpoint');
    res.status(401).send("Unauthorized");
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail.isEmail(username)) {
      logger.log('error','Authentication has been failed due to wrong email address at deleteproduct API endpoint');
      res.status(401).send("Authentication Failed, Please enter a valid email");
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        logger.log('error','please check for the user thrown error at  deleteproduct API endpoint');
        console.log("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          authsuc = result;
          if (authsuc) {
            logger.info('authorization successful');
            console.log("auth success");
            searchProductWithId(pId).then((productDetails) => {
              if (productDetails == null) {
                logger.error('product details not found');
                res.status(404).send("not found");
                console.log(productDetails.owner_user_id);
                console.log(userDetails.id);
              } else if (productDetails.owner_user_id == userDetails.id) {
                console.log(productDetails.owner_user_id);
                console.log(userDetails.id);
                console.log(pId);
                deleteImagesInS3WithProductId(pId).then(() =>{
                  logger.log('info','image related to this product has been deleted');
                  deleteProduct(pId).then((rt) => res.sendStatus(204));
                }
                );
              } else {
                logger.log('error','cant delete the image for this product');
                res.status(403).send("forbidden");
              }
            });
          } else {
            res.status(401).send("unauthorized");
          }
        });
      }
    }
  }
};

const searchProduct = async (sku) => {
  const productDetails = await Product.findOne({
    where: {
      sku: sku,
    },
  });
  return productDetails;
};

const searchProductWithId = async (id) => {
  const productDetails = await Product.findOne({
    where: {
      id: id,
    },
  });
  return productDetails;
};

const createProduct = async (prod) => {
  const product = await Product.create(prod);
  return product;
};

const updateProduct = async (prod) => {
  const updatedProd = Product.update(prod, {
    where: {
      id: prod.id,
    },
  });
  return updatedProd;
};

const deleteProduct = async (id) => {
    await Product.destroy({
        where: { id: id },
    })
    return true;
};

const getAllImagesByProduct = async (productId) => {
  const imagesList = await Image.findAll({
    where: {
      product_id: productId,
    },
    attributes: [
      "image_id",
      "product_id",
      "file_name",
      "date_created",
      "s3_bucket_path",
    ],
  });
  return imagesList;
};

const deleteImagesInS3WithProductId = async (productId) => {
  try {
    const imagesList = await getAllImagesByProduct(productId);
    const promises = imagesList.map((image) => {
      return s3.deleteObject({
        Bucket: awsBucketName,
        Key: image.file_name,
      }).promise();
    });
    await Promise.all(promises);
    logger.info(`Successfully deleted all images for product ID: ${productId}`);
    console.log(`Successfully deleted all images for product ID: ${productId}`);
  } catch (err) {
    logger.error(`Error deleting images for product ID ${productId}: ${err}`);
    console.error(`Error deleting images for product ID ${productId}: ${err}`);
  }
};

module.exports = {
  addproduct,
  updateproduct,
  patchproduct,
  getproduct,
  deleteproduct,
};
