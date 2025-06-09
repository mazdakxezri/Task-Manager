const express = require("express");
const { check } = require("express-validator");

const notificationsController = require("../controllers/notifications-controllers");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.get("/", notificationsController.getNotifications);

router.patch("/:nid", notificationsController.markNotificationAsRead);

router.delete("/:nid", notificationsController.deleteNotification);

module.exports = router; 