const express = require('express');
const {registerUser, loginUser, logout, updatePassword} = require("../controllers/userController");
const verifyToken = require("../middlewares/verifyToken");
const router = express.Router();

//user routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', verifyToken, logout);
router.post('/update-password', verifyToken, updatePassword);


module.exports = router;