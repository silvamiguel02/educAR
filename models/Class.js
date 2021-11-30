var mongoose = require("mongoose");
var classSchema = new mongoose.Schema({
   class_name: String,
   fc_name: String,
   fc_id: String,
   st_id: [{
      st_id : String
   }],
   assignments: [{
      title: String,
      a_details: String,
      a_filename : String,
      homework : [{
         st_name : String,
         st_id : String,
         hw_details : String,
         checked : Number,
         marks : Number,
         h_filename :String,
      }]
   }],
   students: [{
      st_name: String,
      st_id: String
   }],
   discussion: [{
      sender_id : String,
      sender_name : String,
      msg: String,
      date: {
         type:Date,
         default:Date.now
      }
   }],
   joining_id: String,
});

var Class = mongoose.model("Class", classSchema);

module.exports = Class;