const multer = require("multer");
const crypto = require("crypto");
const path = require("path");

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpg": "jpg",
  "image/jpeg": "jpeg",
};

const fileUpload = multer({
  limits: 500000, // 500kb
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/images");
    },
    filename: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype];
      const randomId = crypto.randomBytes(16).toString("hex");
      const timestamp = Date.now();
      cb(null, `${timestamp}-${randomId}.${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error("Invalid mime type.");
    cb(error, isValid);
  },
});

module.exports = fileUpload;
