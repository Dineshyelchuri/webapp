const imageController = require("../controller/imageController");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

// Configure Multer to store files with a unique name
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueId = uuidv4();
    const currentDate = new Date().toISOString();
    const fileName = `${uniqueId}${currentDate}${file.originalname}`;
    cb(null, fileName);
  },
});

// Define the file filter function
const fileFilter = function(req, file, cb) {
    // Accept only image files
    if(!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  };
  
  // Create the multer middleware
  const upload = multer({ storage: storage, fileFilter: fileFilter })

const router = require("express").Router();

router.post("/:productId/image", upload.single("image"), imageController.addImage);

router.get("/:productId/image", imageController.getAllImages);

router.get("/:productId/image/:imageId", imageController.getImage);

router.delete("/:productId/image/:imageId", imageController.deleteImage);


module.exports = router;