const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    role: {
        type: String,
        enum: ["manager", "coordinator", "student", "guest"],
        required: false,
        default: null,
    },
    phoneNumber: {
        type: String,
    },
    city: {
        type: String,
    },
    gender: {
        type: String,
    },
    image: {
        type: String,
        required: false,
    },
    faculty: {
        type: mongoose.Schema.ObjectId,
        ref: 'Faculty',
        required: false,
    },
    selectedBlogs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Blog'
    }]
}, {timestamps:true});

userSchema.pre('save', async function (next) {
    if (this.role === 'guest' && !this.selectedBlogs) {
        this.selectedBlogs = [];
    }
    next();
});

const users = mongoose.model('User', userSchema);

module.exports = {
    User: users,
    roles: userSchema.path('role').enumValues,
};