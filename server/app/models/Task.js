const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TaskSchema = new Schema({
    title: { 
        type: String, 
        required: true },
    type: { type: String, 
        enum: ['Mission', 'Problem'], 
        required: true },
    priority: { 
        type: String, 
        enum: ['Highest', 'High', 'Medium', 'Low', 'Low'], 
        required: true },
    createDate: { 
        type: Date, 
        required: true },
    startDate: { 
        type: Date },
    deadline: { 
        type: Date, 
        required: true },
    endDate: { 
        type: Date },
    description: { type: String },
    status: { type: String, 
        enum: ['Open', 'In progress', 'Done', 'Cancel'], 
        required: true },
    createdBy: { 
        type: String, 
        required: true },
    assignedTo: { type: String },
    stageId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Stage', 
        required: true }
  });
  
  const Task = mongoose.model('Task', TaskSchema);

  module.exports =  Task ;