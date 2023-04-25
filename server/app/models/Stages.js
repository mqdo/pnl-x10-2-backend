const mongoose = require("mongoose")
const Schema = mongoose.Schema

const stageSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDateExpected: {
        type: Date,
        required: true
    },
    endDateActual: {
        type: Date
    },
    reviews: [{
        content: String,
        reviewer: {
            type: Schema.Types.ObjectId,
            ref: 'Users'
        },
        createdAt: {
            type: Date,
            default: Date.now,
            immutable: true
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }],
    tasks: [{
        type: Schema.Types.ObjectId,
        ref: 'Tasks'
    }]
})
const Stages = mongoose.model('Stages', stageSchema);

module.exports = Stages