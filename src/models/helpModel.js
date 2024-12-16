const mongoose = require('mongoose');

const helpSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
        },
        phone: {
            type: String,
            required: [true, 'Phone is required'],
            match: [/^\+?\d{10,15}$/, 'Please enter a valid phone number'],
        },
       notes: {
            type: String,
            trim: true,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    }
);

const Help = mongoose.model('Help', helpSchema);

module.exports = Help;
