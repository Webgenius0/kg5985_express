const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
    name:{type:String},
    role:{type:String , default:'guest'},
},
    {timestamps: true,versionKey: false});

const Guest = mongoose.model('guests', guestSchema);
module.exports = Guest;