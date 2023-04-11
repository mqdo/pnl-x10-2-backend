const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const taskSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['assignment', 'issue'],
        required: true
    },
    priority: {
        type: String,
        enum: ['highest', 'high', 'medium', 'low', 'lowest'],
        required: true
    },
    createdDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    startDate: {
        type: Date,
        required: true
    },
    deadline: {
        type: Date,
        required: true
    },
    endDate: Date,
    description: String,
    status: {
        type: String,
        enum: ['open', 'inprogress', 'review', 'reopen', 'done', 'cancel'],
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'Users'
    },
    comments: {
        type: Schema.Types.ObjectId,
        ref: 'Comments'
    }
});

const Tasks = mongoose.model('Tasks', taskSchema);

module.exports = Tasks;