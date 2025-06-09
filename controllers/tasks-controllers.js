const Task = require("../models/task");
const User = require("../models/user");
const HttpError = require("../models/http-error");
const mongoose = require("mongoose");
const {
  createTaskCompletionNotification,
} = require("./notifications-controllers");

const createTask = async (req, res, next) => {
  const { title, description, priority, dueDate, timeline, notes } = req.body;

  const newTask = new Task({
    title,
    description,
    priority,
    dueDate,
    timeline,
    notes,
    role: "member",
    creator: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (error) {
    const err = new HttpError("Creating task failed, please try again.", 500);
    return next(err);
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id.", 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await newTask.save({ session: sess });
    user.tasks.push(newTask);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    console.log(error);
    const err = new HttpError("Could not create Data, Please Try again.", 500);
    return next(err);
  }

  res.status(201).json({ task: newTask.toObject({ getters: true }) });
};

const createTaskAsAdmin = async (req, res, next) => {
  const {
    title,
    description,
    priority,
    dueDate,
    timeline,
    notes,
    groupName,
    assignedUsers,
  } = req.body;

  // Validate required fields
  if (
    !title ||
    !description ||
    !priority ||
    !dueDate ||
    !timeline ||
    !notes ||
    !groupName ||
    !assignedUsers
  ) {
    return next(new HttpError("Missing required fields", 400));
  }

  // Validate assignedUsers is an array and not empty
  if (!Array.isArray(assignedUsers) || assignedUsers.length === 0) {
    return next(
      new HttpError("At least one user must be assigned to the task", 400)
    );
  }

  // Create the task
  const newTask = new Task({
    title,
    description,
    priority,
    dueDate,
    timeline,
    notes,
    creator: req.userData.userId,
    role: "admin",
    groupName,
    assignedUsers,
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    // Save the task
    await newTask.save({ session: sess });

    // Update creator's tasks
    const creator = await User.findById(req.userData.userId);
    if (!creator) {
      throw new Error("Creator not found");
    }
    creator.tasks.push(newTask);
    await creator.save({ session: sess });

    // Update assigned users' tasks
    for (const userId of assignedUsers) {
      const assignedUser = await User.findById(userId);
      if (assignedUser) {
        assignedUser.tasks.push(newTask);
        await assignedUser.save({ session: sess });
      }
    }

    await sess.commitTransaction();
  } catch (error) {
    console.error(error);
    const err = new HttpError("Could not create task, please try again.", 500);
    return next(err);
  }

  res.status(201).json({ task: newTask.toObject({ getters: true }) });
};

const getTasksByUser = async (req, res, next) => {
  const userId = req.userData.userId;

  try {
    const tasks = await Task.find({
      $or: [{ creator: userId }, { assignedUsers: userId }],
    })
      .populate("creator", "name email")
      .populate("assignedUsers", "name email")
      .sort({ createdAt: -1 });

    // Transform tasks to include creator name and user's role in the task
    const transformedTasks = tasks.map((task) => ({
      ...task.toObject({ getters: true }),
      creatorName: task.creator.name,
      userRole: task.creator._id.toString() === userId ? "creator" : "assigned",
      status: task.status || "todo",
    }));

    res.json(transformedTasks);
  } catch (error) {
    const err = new HttpError("Server Error", 500);
    return next(err);
  }
};

const getTaskById = async (req, res, next) => {
  const taskId = req.params.tid;

  let task;
  try {
    task = await Task.findById(taskId);
  } catch (error) {
    const err = new HttpError(
      "Something went wrong, could not find a task.",
      500
    );
    return next(err);
  }

  if (!task) {
    const error = new HttpError(
      "Could not find the task for the provided id.",
      404
    );
    return next(error);
  }

  res.json({ task: task.toObject({ getters: true }) });
};

const updateTask = async (req, res, next) => {
  const taskId = req.params.tid;
  const { dueDate, timeline, notes } = req.body;

  if (!dueDate && !timeline && !notes) {
    return next(
      new HttpError(
        "At least one field (dueDate, timeline, or notes) must be provided",
        400
      )
    );
  }

  try {
    const task = await Task.findById(taskId);

    if (!task) {
      return next(new HttpError("Task not found", 404));
    }

    const allowedUpdates = {};
    if (dueDate !== undefined) allowedUpdates.dueDate = dueDate;
    if (timeline !== undefined) allowedUpdates.timeline = timeline;
    if (notes !== undefined) allowedUpdates.notes = notes;

    Object.assign(task, allowedUpdates);

    const updatedTask = await task.save();

    res.status(200).json({
      success: true,
      task: {
        id: updatedTask._id,
        dueDate: updatedTask.dueDate,
        timeline: updatedTask.timeline,
        notes: updatedTask.notes,
      },
    });
  } catch (error) {
    console.error("Update task error:", error);
    return next(new HttpError("Could not update task", 500));
  }
};

const deleteTask = async (req, res, next) => {
  const taskId = req.params.tid;

  let task;
  try {
    task = await Task.findById(taskId).populate("creator");
  } catch (error) {
    return next(new HttpError("Could not get the task.", 500));
  }

  if (!task) {
    return next(new HttpError("Task not found", 404));
  }

  if (task.creator.id !== req.userData.userId) {
    return new HttpError("You are not allowed to Delete this task.", 403);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await task.deleteOne({ session: sess });
    task.creator.tasks.pull(task);
    await task.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    const err = new HttpError("Could not remove this task.", 500);
    return next(err);
  }

  res.status(200).json({ message: "Delete Task." });
};

const updateTaskStatus = async (req, res, next) => {
  const taskId = req.params.tid;
  const { status } = req.body;
  const userId = req.userData.userId;

  if (!status || !["todo", "inProgress", "done"].includes(status)) {
    return next(new HttpError("Invalid status value", 400));
  }

  let task;
  try {
    task = await Task.findById(taskId).populate("creator");
  } catch (error) {
    return next(new HttpError("Could not find task", 404));
  }

  if (!task) {
    return next(new HttpError("Task not found", 404));
  }

  // Check if user is authorized to update the task
  if (
    task.creator._id.toString() !== userId &&
    !task.assignedUsers.includes(userId)
  ) {
    return next(new HttpError("Not authorized to update this task", 403));
  }

  task.status = status;

  try {
    await task.save();

    // Create notification if task is marked as done by a member
    if (
      status === "done" &&
      task.role === "admin" &&
      task.creator._id.toString() !== userId
    ) {
      await createTaskCompletionNotification(taskId, userId, task.creator._id);
    }

    res.json({ task: task.toObject({ getters: true }) });
  } catch (error) {
    return next(new HttpError("Could not update task status", 500));
  }
};

exports.getTasksByUser = getTasksByUser;
exports.createTask = createTask;
exports.updateTask = updateTask;
exports.deleteTask = deleteTask;
exports.createTaskAsAdmin = createTaskAsAdmin;
exports.updateTaskStatus = updateTaskStatus;
exports.getTaskById = getTaskById;

// const updateTaskStatus = async (req, res, next) => {
//   const taskId = req.params.tid;
//   const { status } = req.body;
//   const userId = req.userData.userId;

//   if (!status || !["todo", "inProgress", "done"].includes(status)) {
//     return next(new HttpError("Invalid status value", 400));
//   }

//   let task;
//   try {
//     task = await Task.findById(taskId).populate("creator");
//   } catch (error) {
//     return next(new HttpError("Could not find task", 404));
//   }

//   if (!task) {
//     return next(new HttpError("Task not found", 404));
//   }

//   // Check if user is authorized to update the task
//   if (task.creator._id.toString() !== userId && !task.assignedUsers.includes(userId)) {
//     return next(new HttpError("Not authorized to update this task", 403));
//   }

//   task.status = status;

//   try {
//     await task.save();

//     // Create notification if task is marked as done by a member
//     if (status === "done" && task.role === "admin" && task.creator._id.toString() !== userId) {
//       await createTaskCompletionNotification(taskId, userId, task.creator._id);
//     }

//     res.json({ task: task.toObject({ getters: true }) });
//   } catch (error) {
//     return next(new HttpError("Could not update task status", 500));
//   }
// };
