const express = require("express");

const tasksControllers = require("../controllers/tasks-controllers");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.use(checkAuth);

router.get("/user/:uid", tasksControllers.getTasksByUser);

router.post("/member", tasksControllers.createTask);

router.post("/admin", tasksControllers.createTaskAsAdmin);

router.get("/:tid", tasksControllers.getTaskById);

router.patch("/:tid", tasksControllers.updateTask);

router.patch("/:tid/status", tasksControllers.updateTaskStatus);

router.delete("/:tid", tasksControllers.deleteTask);

module.exports = router;
