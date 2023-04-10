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
    evaluations: [{
        content: String,
        evaluator: {
            type: Schema.Types.ObjectId,
            ref: 'Users'
        },
    }],
    tasks: [{
        type: Schema.Types.ObjectId,
        ref: 'Tasks'
    }]
})
const Stages = mongoose.model('Stages', stageSchema);

module.exports = Stages