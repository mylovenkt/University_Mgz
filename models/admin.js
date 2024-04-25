const mongoose = require('mongoose');
const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        minlenght: 6,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    isAdmin: {
        type: Boolean,
        default: true,
    },
}, {timestamps:true});
module.exports = mongoose.model('Admin', adminSchema);