const catchAsync = require("./catchAsync");
const AppError = require("./AppError");
const nodemailer = require("nodemailer");

const sendOtpEmail = catchAsync(async (options,next)=>{
    const { to, subject,  html } = options;

    // Basic validation for required fields
    if (!to || !subject ||  !html) {
        next(new AppError('Recipient email, subject, and content are required', 400));
    }

    // Set up the nodemailer transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "abdussjscript@gmail.com",
            pass: "rxfkwcfbudkkpgnl",
        },
    });

    // Email options
    const mailOptions = {
        from: "abdussjscript@gmail.com",
        to,
        subject,
        html,
    };
    // Send email
    await transporter.sendMail(mailOptions);
});

module.exports = sendOtpEmail;