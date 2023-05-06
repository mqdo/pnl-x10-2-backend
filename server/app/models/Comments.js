const mongoose = require("mongoose")
const Schema = mongoose.Schema

const commentSchema = new Schema({
  content: {
    type: String,
    required: true
  },
  createdDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  commenter: {
    type: Schema.Types.ObjectId,
    ref: 'Users'
  }
})
const Comments = mongoose.model('Comments', commentSchema);

module.exports = Comments