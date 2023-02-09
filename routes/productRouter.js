const productController = require("../controller/productController");

const router = require("express").Router();

router.post("/", productController.addproduct);

router.put("/:productId", productController.updateproduct);

router.patch("/:productId", productController.patchproduct);

router.get("/:productId", productController.getproduct);

router.delete("/:productId", productController.deleteproduct);

module.exports = router;
