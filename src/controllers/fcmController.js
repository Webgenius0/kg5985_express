const FCM = require('../models/fcmTokenModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.updateOrCreateFcmToken = catchAsync(async (req, res, next) => {
    const { token } = req.body;
    const userID = req.user._id;

    console.log(userID);

    if (!token) {
        return next(new AppError('FCM token is required', 400));
    }

    const existingToken = await FCM.findById(userID);


    if (existingToken) {
        existingToken.fcmToken = token;
        await existingToken.save();
        return res.status(200).json({
            status: 'success',
            message: 'FCM token updated successfully',
        });
    } else {
        const newToken = await FCM.create({ userID, fcmToken: token });
        return res.status(201).json({
            status: 'success',
            message: 'FCM token created successfully',
            data: newToken,
        });
    }
});
