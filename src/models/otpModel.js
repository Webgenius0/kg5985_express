const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: { type: String, required: [true, 'Please enter a valid email'],index: true },
    otp: { type: String, required: [true, 'Please enter a valid otp'],trim: true },
    isVerified: { type: Boolean, default: false },
}, { timestamps: true,versionKey: false });

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;
