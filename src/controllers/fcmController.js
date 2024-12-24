const FCM = require('../models/fcmTokenModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.updateOrCreateFcmToken = catchAsync(async (req, res, next) => {
    const { token } = req.body;
    const userID = req.user._id;

    if (!token) {
        return next(new AppError('FCM token is required', 400));
    }

    const result = await FCM.updateOne(
        { userID: userID }, // Query to find the document
        {
            $set: { fcmToken: token }, // Set the new token
            $currentDate: { updatedAt: true } // Automatically update the `updatedAt` field
        }
    );

    if (result.modifiedCount > 0) {
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

