const mongoose = require("mongoose");

const taskSchema = mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    required: true,
  },
  dueDate: { type: Date, required: true },
  timeline: { type: String, required: true },
  notes: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "member"],
    required: true,
  },
  groupName: {
    type: String,
    required: function() {
      return this.role === "admin";
    }
  },
  assignedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: function() {
      return this.role === "admin";
    }
  }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["todo", "inProgress", "done"],
    default: "todo",
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model("Task", taskSchema);
