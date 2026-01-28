const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    fullname: {
        firstName: {
            type: String,
            required: true
        },
        lastName: {
            type: String,
            required: true
        }
    },
    password: {
        type: String,
        required: true
    }
},
{ timestamps: true }
);

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;