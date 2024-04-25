const mongoose = require('mongoose');
const termsSchema = mongoose.Schema({
    content: {
        type: String,
        required: true,
        trim: true
    },
}, { timestamps: true});

module.exports = mongoose.model('Terms', termsSchema);