const express = require("express");
const db = require("../model");
const bcrypt = require("bcrypt");
const multer = require("multer");
const { images } = require("../model");
const isEmail = require("./userController");
const productController = require("./productController");
const app = require("../server");
const AWS = require("aws-sdk");
const fs = require("fs");

const Product = db.products;
const User = db.users;
const Image = db.images;

const awsBucketName = process.env.AWS_BUCKET_NAME;

const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: "us-east-1",
  region: process.env.aws_region,
});

// Upload image to S3 bucket
const uploadImageToS3 = (bucketName, fileName, filePath) => {
  const fileContent = fs.readFileSync(filePath);

  const params = {
    Bucket: bucketName,
    Key: fileName,
    Body: fileContent,
    ContentType: "image/jpeg",
    ACL: "private",
  };

  return s3.upload(params).promise();
};

const addImage = async (req, res) => {
  if (!req.is("multipart/form-data")) {
    return res
      .status(400)
      .send("Invalid Request Type - Use 'multipart/form-data'");
  } else if (!req.file) {
    return res.status(400).send("Please upload an image");
  } else {
    const productId = req.params.productId;
    let authorizationSuccess = false;
    let userDetails = "";
    let productDetails = "";
    let authheader = req.headers.authorization;
    if (!authheader) {
      res.status(401).send("Unauthorized");
    } else {
      //User Auth Check Start
      var auth = new Buffer.from(authheader.split(" ")[1], "base64")
        .toString()
        .split(":");
      var username = auth[0];
      var password = auth[1];
      if (!isEmail.isEmail(username)) {
        res
          .status(401)
          .send("Authentication Failed, Please enter a valid email");
      } else {
        userDetails = await User.findOne({
          where: {
            username: username,
          },
        });
        if (userDetails == null) {
          console.log("------> User Not Found");
          res.status("User Not Found").sendStatus(401);
        } else {
          bcrypt.compare(password, userDetails.password, (err, result) => {
            if (err) throw err;
            authorizationSuccess = result;
            if (authorizationSuccess) {
              console.log("Authorization Successful!");
              ownerProduct(productId)
                .then((product) => {
                  if (product == null) {
                    console.log("Product Not Found");
                    res.sendStatus(401);
                  } else if (product.owner_user_id != userDetails.id) {
                    res.sendStatus(403);
                  } else {
                    //Image Upload to S3
                    uploadImageToS3(
                      awsBucketName,
                      req.file.filename,
                      req.file.path
                    )
                      .then((data) => {
                        console.log(data);
                        const imgData = {
                          product_id: product.id,
                          file_name: data.Key,
                          s3_bucket_path: data.Location,
                          productId: product.id,
                        };
                        createImage(imgData).then((imgRes) => {
                          console.log(imgRes);
                          if (imgRes == null) {
                            console.log("Image Creation Failed");
                            res.status(400).send("Image Creation Failed");
                          } else {
                            res.status(201).send({
                              image_id: imgRes.image_id,
                              product_id: imgRes.product_id,
                              file_name: imgRes.file_name,
                              date_created: imgRes.date_created,
                              s3_bucket_path: imgRes.s3_bucket_path,
                            });
                          }
                        });
                      })
                      .catch((error) => {
                        console.error(error);
                        res.status(401).send(error);
                      });
                  }
                });
            } else {
              console.log("Authentication Failed");
              res.status(401).send("Authentication Failed");
            }
          });
        }
      }
    }
  }
};

const deleteImage = async (req, res) => {
  let userDetails = "";
  let pId = req.params.productId;
  let imgId = req.params.imageId;
  let authheader = req.headers.authorization;
  if (!authheader) {
    res.status(401).send("Unauthorized");
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail.isEmail(username)) {
      res.status(401).send("Authentication Failed, Please enter a valid email");
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        console.log("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          if (result) {
            console.log("auth success");
           ownerProduct(pId).then((pdetails) => {
              if (pdetails == null) {
                res.status(404).send("not found");
              } else if (pdetails.owner_user_id != userDetails.id) {
                res.status(403).send("forbidden");
              } else {
                searchImageWithId(imgId).then((imageDetails) => {
                  if (imageDetails == null) {
                    res.status(404).send("not found");
                  } else if (imageDetails.product_id == pId) {
                    //Delete Image from S3
                    s3.deleteObject({
                      Bucket: awsBucketName,
                      Key: imageDetails.file_name,
                    }).promise();
                    //Delete Image in DB
                    deleteImageFromDb(imgId).then((rt) => res.sendStatus(204));
                  } else {
                    res.sendStatus(400);
                  }
                });
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

const getAllImages = async (req, res) => {
  let userDetails = "";
  let pId = req.params.productId;
  let imgId = req.params.imageId;
  let authheader = req.headers.authorization;
  if (!authheader) {
    res.status(401).send("Unauthorized");
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail.isEmail(username)) {
      res.status(401).send("Authentication Failed, Please enter a valid email");
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        console.log("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          if (result) {
            ownerProduct(pId).then((pdetails) => {
              if (pdetails == null) {
                res.status(404).send("not found");
              } else if (pdetails.owner_user_id != userDetails.id) {
                res.status(403).send("forbidden");
              } else {
                getAllImagesByProduct(pId).then((iList) => {
                  if (iList.length == 0) {
                    res.sendStatus(404);
                  } else {
                    res.status(200).send(iList);
                  }
                });
              }
            });
          }else{
            // console.log("please enter a valid password");
            res.status(401).send("unauthorized");
          }
        });
      }
    }
  }
};

const getImage = async (req, res) => {
  let userDetails = "";
  let pId = req.params.productId;
  let imgId = req.params.imageId;
  let authheader = req.headers.authorization;
  if (!authheader) {
    res.status(401).send("Unauthorized");
  } else {
    //User Auth Check Start
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];
    if (!isEmail.isEmail(username)) {
      res.status(401).send("Authentication Failed, Please enter a valid email");
    } else {
      userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        console.log("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
      } else {
        bcrypt.compare(password, userDetails.password, (err, result) => {
          if (err) throw err;
          if (result) {
            ownerProduct(pId).then((pdetails) => {
              if (pdetails == null) {
                res.status(404).send("not found");
              } else if (pdetails.owner_user_id != userDetails.id) {
                res.status(403).send("forbidden");
              } else {
                searchImageWithId(imgId).then((imageDetails) => {
                  if (imageDetails == null) {
                    res.sendStatus(404);
                  } else if (imageDetails.product_id != pId) {
                    res.sendStatus(400);
                  } else {
                    res.status(200).send(imageDetails);
                  }
                });
              }
            });
          }else{
            res.status(401).send("unauthorized");
          }
        });
      }
    }
  }
};

const createImage = async (img) => {
  const image = await Image.create(img);
  return image;
};

const searchImageWithId = async (id) => {
  const imageDetails = await Image.findOne({
    where: {
      image_id: id,
    },
    attributes: [
      "image_id",
      "product_id",
      "file_name",
      "date_created",
      "s3_bucket_path",
    ],
  });
  return imageDetails;
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

const deleteImageFromDb = async (id) => {
  await Image.destroy({
    where: { image_id: id },
  });
  return true;
};

const deleteImagesInS3WithProductId = async (productId) => {
  getAllImagesByProduct(productId).then((imagesList) => {
    imagesList.forEach((image) => {
      s3.deleteObject({
        Bucket: awsBucketName,
        Key: image.file_name,
      }).promise();
    });
  });
};
const ownerProduct = async (id) => {
    const productDetails = await Product.findOne({
        where: {
            id: id,
        },
    });
    return productDetails;
};
module.exports = {
  addImage,
  deleteImage,
  getAllImages,
  getImage,
  deleteImagesInS3WithProductId,
};