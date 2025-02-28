const express = require('express');
const {registerUser, loginUser, logout, updatePassword, updateProfile, forgotPassword, resetPassword, verifyOtp} = require("../controllers/userController");
const verifyToken = require("../middlewares/verifyToken");
const {createReminder, deleteReminder, getSingleReminder,
    getAllReminders, activeReminders, completedReminder, snoozedList,
    locationList, createLocation, snoozeNewReminder, reSnoozeReminder,
    everSnoozedButNotCompleted, completeSnoozedReminder
} = require("../controllers/reminderController");
const {createHelp} = require("../controllers/helpController");
const {resizeImages, upload} = require("../utils/multer");
const {updateOrCreateFcmToken} = require("../controllers/fcmController");
const {guestLogin} = require("../controllers/guestController");
const checkReminderLimit = require("../middlewares/checkReminderLimit");
const router = express.Router();

//user routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/guest-login', guestLogin);
router.post('/logout', verifyToken, logout);
router.post('/update-password', verifyToken, updatePassword);
router.put('/update-profile', verifyToken, updateProfile);
router.post('/forgot-password', forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post('/reset-password',resetPassword);


//reminders
router.post('/create-reminder',verifyToken,checkReminderLimit, upload.array('images'),resizeImages, createReminder );
router.get("/locations", verifyToken, locationList);
router.post("/create-location",verifyToken, createLocation);
router.get('/reminders',verifyToken, getAllReminders);
router.get('/reminder/:id',verifyToken, getSingleReminder);
router.get('/active-reminders',verifyToken, activeReminders);
router.get('/complete-reminders',verifyToken, completedReminder);
router.delete('/remove-reminder/:id',verifyToken, deleteReminder);

router.put('/re-snooze/:id',verifyToken,checkReminderLimit, reSnoozeReminder);

//snoozed reminder
router.post('/create-snooze',verifyToken,checkReminderLimit, upload.array('images'),resizeImages, snoozeNewReminder );
router.get('/snooze-list',verifyToken, snoozedList);
router.get('/ever-snoozed',verifyToken, everSnoozedButNotCompleted);
router.put('/complete-snooze/:id',verifyToken,completeSnoozedReminder);

//manage fcm
router.post('/update-fcm-token', verifyToken, updateOrCreateFcmToken);



//help & support
router.post('/create-help',createHelp);


module.exports = router;