// models/FileModel.js

const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    filename: String,
    contentType: String,
    data: Buffer,
    
    blog: {
        type: mongoose.Schema.ObjectId,
        ref: 'Blog',
        required: true,
    },
}, {timestamps: true});

const FileModel = mongoose.model('File', fileSchema);

module.exports = FileModel;
