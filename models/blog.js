const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    backgroundImage: {
        type: String,
        required: true,
    },
    status: {
        type:String,
        enum: ["pending", "publish", "rejected"],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    faculty: {
        type: mongoose.Schema.ObjectId,
        ref: 'Faculty',
        required: true,
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref:"User",
        required: true,
    },
    academy: {
        type: mongoose.Schema.ObjectId,
        ref: "Academy",
        required: true,
    },
}, {timestamps: true});

module.exports = mongoose.model('Blog', blogSchema);