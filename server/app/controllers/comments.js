const express = require('express');
const Task = require("../models/Tasks");
const User = require("../models/Users");
const Comment = require("../models/Comments");
const getcomments = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId).populate({
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
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Tạo Comment mới
    const comment = new Comment({
      content: req.body.content,
      commenter: req.body.commenter,
    });

    const savedComment = await comment.save();
    task.comments.push(savedComment);
    await task.save();
    return res.json(savedComment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { addcomment, getcomments };
