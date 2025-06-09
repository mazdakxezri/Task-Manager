const Notification = require("../models/notification");
const HttpError = require("../models/http-error");

const createTaskCompletionNotification = async (taskId, memberId, adminId) => {
  try {
    const notification = new Notification({
      task: taskId,
      member: memberId,
      admin: adminId,
      message: `A member has completed their assigned task.`,
    });
    await notification.save();
    return notification;
  } catch (error) {
    throw new HttpError("Creating notification failed.", 500);
  }
};

const getNotifications = async (req, res, next) => {
  const adminId = req.userData.userId;

  let notifications;
  try {
    notifications = await Notification.find({ admin: adminId })
      .populate("task", "title")
      .populate("member", "name")
      .sort({ createdAt: -1 });
  } catch (error) {
    return next(new HttpError("Fetching notifications failed.", 500));
  }

  res.json({
    notifications: notifications.map((notification) => ({
      id: notification._id,
      taskTitle: notification.task?.title,
      memberName: notification.member?.name,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    })),
  });
};

const markNotificationAsRead = async (req, res, next) => {
  const notificationId = req.params.nid;

  let notification;
  try {
    notification = await Notification.findById(notificationId);
  } catch (error) {
    return next(new HttpError("Could not find notification.", 404));
  }

  if (!notification) {
    return next(new HttpError("Notification not found.", 404));
  }

  if (notification.admin.toString() !== req.userData.userId) {
    return next(
      new HttpError("Not authorized to update this notification.", 403)
    );
  }

  notification.isRead = true;

  try {
    await notification.save();
  } catch (error) {
    return next(new HttpError("Updating notification failed.", 500));
  }

  res.json({ message: "Notification marked as read." });
};

const deleteNotification = async (req, res, next) => {
  const notificationId = req.params.nid;

  let notification;
  try {
    notification = await Notification.findById(notificationId);
  } catch (error) {
    return next(new HttpError("Could not delete notification.", 500));
  }

  if (!notification) {
    return next(new HttpError("Notification not found.", 404));
  }

  if (notification.admin.toString() !== req.userData.userId) {
    return next(
      new HttpError("Not authorized to delete this notification.", 403)
    );
  }

  try {
    await notification.deleteOne();
  } catch (error) {
    return next(new HttpError("Deleting notification failed.", 500));
  }

  res.json({ message: "Notification deleted successfully." });
};

exports.createTaskCompletionNotification = createTaskCompletionNotification;
exports.getNotifications = getNotifications;
exports.markNotificationAsRead = markNotificationAsRead;
exports.deleteNotification = deleteNotification;
