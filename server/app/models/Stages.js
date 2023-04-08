const mongoose = require("mongoose")
const Schema = mongoose.Schema

const StageSchema = new Schema({
    name: { 
        type: String, 
        required: true},
    startDate: { 
        type: Date, 
        required: true },
    endDateExpected: { 
        type: Date, 
        required: true },
    endDateActual: { 
        type: Date },
    evaluations: [{ 
        content: String, 
        evaluator: String }]
})
const Stages = mongoose.model('Stage', StageSchema);

module.exports = Stages