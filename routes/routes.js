const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');

const user = require("../models/User");
const {Class} = require("../models/Schema");

router.get('/',forwardAuthenticated,(req, res) => res.render('login'));
router.get('/dashboard', ensureAuthenticated, (req, res) =>
  res.render('dashboard', {
    user: req.user
  })
);
router.get('/login',forwardAuthenticated, (req, res) => res.render('login'));
router.get('/register',forwardAuthenticated, (req, res) => res.render('register'));

router.post("/discussion/:cid/:id/", async (req, res)=>{
  try {
    var cid = req.params.cid;
    var id = req.params.id;
    const data = await user.findById(id);
    const cdata = await Class.findOneAndUpdate({ "_id": cid },
      {
        $push:
        {
          "discussion": [{
            "sender_id" : data._id,
            "sender_name" : data.name,
            "msg": req.body.msg,
          }]
        },
        $currentDate : 
        {
          "discussions" : [{
            date : true,
          }]
        }
      });
      if(id === cdata.fc_id){
        const url = "/assignment/" + cid + "/" + id + "/";
        res.redirect(url);
      }
      else{
        const url = "/homework/" + cid + "/" + id + "/";
        res.redirect(url);
      }
  }
  catch (e) {
    console.log(e);
  }
});

module.exports = router;