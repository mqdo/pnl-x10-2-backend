const express = require("express");
const Task = require("../models/Tasks");
const User = require("../models/Users");
const Comment = require("../models/Comments");
const getcomments = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate({
      path: "comments",
      populate: {
        path: "commenter",
        select: "fullName avatar _id",
      },
    });
    res.json(task.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error get comment");
  }
};

const addcomment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Tạo Comment mới
    const comment = new Comment({
      content: req.body.content,
      commenter: req.user.id,
    });

    const savedComment = await comment.save();
    task.comments.push(savedComment);
    await task.save();
    return res.json(savedComment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error add comment" });
  }
};
const deletecomment = async (req, res) => {
  try {
    // Lấy Task theo ID
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Xóa comment trong comments
    const comment = await Comment.findByIdAndDelete(req.params.commentid);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Xóa comment trong task
    const index = task.comments.indexOf(comment._id);
    if (index > -1) {
      task.comments.splice(index, 1);
      await task.save();
    }

    // Trả về thông tin Comment đã bị xóa
    return res.json(task);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error" });
  }
};

module.exports = { addcomment, getcomments, deletecomment };
