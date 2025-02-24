const express = require('express');
const {registerUser, loginUser, logout, updatePassword, updateProfile, forgotPassword, resetPassword, verifyOtp} = require("../controllers/userController");
const verifyToken = require("../middlewares/verifyToken");
const {createReminder, deleteReminder, getSingleReminder,
    getAllReminders, activeReminders, completedReminder, snoozeReminder, snoozedList,
    updateReminderTime, locationList, createLocation, updateReminder
} = require("../controllers/reminderController");
const {createHelp} = require("../controllers/helpController");
const {resizeImages, upload} = require("../utils/multer");
const {updateOrCreateFcmToken} = require("../controllers/fcmController");
const router = express.Router();

//user routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', verifyToken, logout);
router.post('/update-password', verifyToken, updatePassword);
router.put('/update-profile', verifyToken, updateProfile);
router.post('/forgot-password', forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post('/reset-password',resetPassword)


//reminders
router.post('/create-reminder',verifyToken, upload.array('images'),resizeImages, createReminder );
router.put("/update-reminder/:id",verifyToken, updateReminder);
router.delete('/remove-reminder/:id',verifyToken, deleteReminder);
router.get('/reminder/:id',verifyToken, getSingleReminder);
router.get('/reminders',verifyToken, getAllReminders);
router.get('/active-reminders',verifyToken, activeReminders);
router.get('/complete-reminders',verifyToken, completedReminder);
router.get("/locations", verifyToken, locationList);
router.post("/create-location",verifyToken, createLocation);

//manage fcm
router.post('/update-fcm-token', verifyToken, updateOrCreateFcmToken);

//snoozed reminder
router.put('/create-snooze/:id',verifyToken, snoozeReminder);
router.get('/snooze-list',verifyToken, snoozedList);
router.put('/set-snooze-time/:id',verifyToken,updateReminderTime)

//help & support
router.post('/create-help',createHelp);


module.exports = router;