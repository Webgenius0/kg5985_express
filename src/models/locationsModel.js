const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    name:{type:String,index:true,trim:true},
    latitude:{type:String,index:true,trim:true},
    longitude:{type:String,index:true,trim:true},
},
    {versionKey:false,timestamps:true});

const Locations = mongoose.model("locations", locationSchema);
module.exports = Locations;