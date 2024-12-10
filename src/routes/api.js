const express = require('express');
const {registerUser, loginUser, logout, updatePassword} = require("../controllers/userController");
const verifyToken = require("../middlewares/verifyToken");
const {createReminder, updateReminder, deleteReminder, getSingleReminder, markReminderAsCompleted, scheduleReminder} = require("../controllers/reminderController");
const router = express.Router();

//user routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', verifyToken, logout);
router.post('/update-password', verifyToken, updatePassword);


//reminders
router.post('/create-reminder',verifyToken, createReminder );
router.put('/update-reminder',verifyToken,updateReminder);
router.delete('/remove-reminder',verifyToken, deleteReminder);
router.get('/reminder/:id',verifyToken, getSingleReminder);
router.get('/reminders',verifyToken, getSingleReminder);
router.get('/schedule-reminder/:id',verifyToken,scheduleReminder);





module.exports = router;