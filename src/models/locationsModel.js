const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    locationTitle:{type:String,index:true,trim:true},
    locationAddress:{type:String,index:true,trim:true},
    latitude:{type:String,index:true,trim:true},
    longitude:{type:String,index:true,trim:true},
},
    {versionKey:false,timestamps:true});

const Locations = mongoose.model("locations", locationSchema);
module.exports = Locations;