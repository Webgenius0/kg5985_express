const catchAsync = require('../utils/catchAsync');
const AppError = require("../utils/AppError");
const Help = require("../models/helpModel");
const emailUtility = require("../utils/emailUtility");


// Create Help
exports.createHelp = catchAsync(async (req, res, next) => {
    try{
        const { fullName, email, phone, notes } = req.body;


        if (!fullName || !email || !phone) {
            return next(new AppError("Please provide valid full name, email, and phone", 400));
        }

        const mailOptions = {
            from: email,
            to: process.env.EMAIL_USER,
            subject:"Help & Support" ,
            text:`Full Name: ${fullName} Phone: ${phone} , notes: ${notes ? notes : 'I need some help.please contact me'}`,
        };

        await emailUtility(mailOptions,next);

        await Help.create({
            fullName,
            email,
            phone,
            notes
        });


        res.status(201).json({
            status: 'success',
            message: 'Successfully submitted your message.We will contact you ASAP!😊',
        })
    }
    catch (error) {
        next(error);
    }
});
