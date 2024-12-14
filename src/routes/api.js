const express = require('express');
const {registerUser, loginUser, logout, updatePassword} = require("../controllers/userController");
const verifyToken = require("../middlewares/verifyToken");
const {createReminder, updateReminder, deleteReminder, getSingleReminder, scheduleReminder,
    getAllReminders, activeReminders
} = require("../controllers/reminderController");
const {createHelp} = require("../controllers/helpController");
const {resizeImages, upload} = require("../utils/multer");
const router = express.Router();

//user routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', verifyToken, logout);
router.post('/update-password', verifyToken, updatePassword);


//reminders
router.post('/create-reminder',verifyToken, upload.array('images'),resizeImages, createReminder );
router.put('/update-reminder/:id',verifyToken,updateReminder);
router.delete('/remove-reminder',verifyToken, deleteReminder);
router.get('/reminder/:id',verifyToken, getSingleReminder);
router.get('/reminders',verifyToken, getAllReminders);
router.post('/schedule-reminder/:id',verifyToken,scheduleReminder);
router.get('/active-reminders',verifyToken, activeReminders);

//help & support
router.post('/create-help',createHelp);


module.exports = router;