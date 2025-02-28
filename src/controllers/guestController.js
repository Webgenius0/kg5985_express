const jwt = require("jsonwebtoken");
const catchAsync = require('../utils/catchAsync');
const Guest = require("../models/guestModel");

exports.guestLogin = catchAsync(async (req, res) => {
    const { name } = req.body;
    const guest = await Guest.create({ name });
    console.log(guest);
    const payload = { id: guest._id, role: guest.role };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "30d",
    });

    res.status(200).json({
        status: "success",
        token,
        message: "Guest Mode Created Successfully",
        data: {user: guest.toJSON()},
    });
});