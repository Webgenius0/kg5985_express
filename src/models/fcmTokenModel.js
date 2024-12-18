const mongoose = require('mongoose');

const fcmSchema = new mongoose.Schema({
    userID:{type:mongoose.Schema.Types.ObjectId, required:[true, 'User ID is required']},
    fcmToken:{type:String,required: [true, 'FcmToken is required']}
},
    {versionKey:false,timestamps:true});

const FCM = mongoose.model("fcms",fcmSchema);
module.exports = FCM;