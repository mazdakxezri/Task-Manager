const express = require("express");
const { check } = require("express-validator");

const UsersControllers = require("../controllers/users-controllers");
const fileUpload = require("../middleware/file-upload");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get("/", UsersControllers.getAllUsers);

router.get("/:uid/profile", UsersControllers.getUserProfile);

router.patch(
  "/:uid/profile",
  checkAuth,
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
  ],
  UsersControllers.updateUserProfile
);

router.post(
  "/signup",
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  UsersControllers.userSignup
);

router.post("/login", UsersControllers.userLogin);

module.exports = router;
