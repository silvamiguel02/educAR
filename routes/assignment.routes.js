const express = require('express');
const router = express.Router();

require('dotenv').config();
require("express-ejs-layouts");
require("express-layouts");

var bp = require("body-parser");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const {GridFsStorage}  = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");


//BD
const mongoose = require("mongoose");
const {Faculty, Class} = require("../models/Schema");
const user = require("../models/User");

const {accessFaculty} = require("../config/auth");

router.use(bp.json());
router.use(methodOverride("_method"));

router.use(bp.urlencoded({ extended: false }));
router.use(express.static("public"));

const mongoURL = "mongodb+srv://user_node_educar:1fNjVEDcS08KkU3O@educar.tbflt.mongodb.net/educAR"
const conn = mongoose.createConnection( process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
let gfs;

conn.once('open', () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection("uploads");
})

const storage = new GridFsStorage({
    url: mongoURL,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});

const upload = multer({ storage });

//Pagina para crear tarea - PRIVADO
router.get("/create/:cid/",accessFaculty, async (req, res) => {
    try{
       res.render("./faculty/faculty_assign_create", { cid: req.params.cid });
    }
    catch(e){
        console.log("Error" , e);
    }
});

// RUTA-POST para crear la tarea
router.post("/assign-create/:id/",accessFaculty,upload.single("file"), async (req, res) => {
    var filename = req.file.filename
   const id = req.params.id;
    try {
        await Class.findOneAndUpdate({ "_id": id },
            {
                $push:
                {
                    "assignments": [{
                        "title": req.body.a_name,
                        "a_details" : req.body.a_details,
                        "a_filename" : filename,
                    }]
                }
            });
    }
    catch (e) {
        console.log("Error", e);
    }
    const url = "/assignment/assign-show/" + id + "/";
    res.redirect(url);
});

// RUTA-POST para eliminar la tarea
router.post("/assign-delete/:id/:cid/",accessFaculty, async (req, res) => {
    try {
        var id = req.params.id;
        var cid = req.params.cid;
        console.log("id" , id);
        console.log("cid" , cid);
        const data = await Class.findOneAndUpdate({ "_id": cid },
            {
                $pull:
                    { "assignments": { "_id": id } }
            });
    }
    catch (e) {
        console.log("Error", e);
    }
    const url = "/assignment/assign-show/" + cid + "/";
    res.redirect(url);
});

// Pagina para ver las tareas enviadas en la asignatura - PRIVADO
router.get("/assign-show/:cid/",accessFaculty, async (req, res) => {
    try {
        var cid = req.params.cid;
        const data = await Class.findById(cid);
        const ad = await data.assignments;
        const id = await data.fc_id;
        
        console.log(ad);
        res.render("./faculty/faculty_classwork.ejs", { data: ad, id: id  , cid : cid});
    }
    catch (e) {
        console.log("Error", e);
    }
});

// Pagina para ver el archivo de la tarea - PUBLICO
router.get("/images/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      if (!file || file.length === 0) {
          return res.status(404).json({
              err: "No file found"
          })
      }
      //if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
          const readstream = gfs.createReadStream(file.filename);
          readstream.pipe(res);
      //}
  });
});

// Pagina para crear asignatura - PUBLICO
router.get("/create-class/:id/", async (req, res) => {
    try{
        var id =   req.params.id;
        var data = await user.findById(id);
        var name = data.name;
        res.render("./faculty/class_creation" , {id : id , name : name});
    }
    catch(e){
        console.log("Error", e);
    }
});

// RUTA-POST para crear la asignatura
router.post("/create-class/:id/", async (req, res) => {
    console.log("post");
    try {
        const data = await user.find({ _id: req.params.id })
        const g = await Faculty.create({
            fc_name: data[0].name,
            fc_id: data[0]._id,
        });
        const ifFound = await Class.find({ joining_id: req.body.joining_id });
        if (ifFound != '') {
            res.render("./faculty/class_creation", { id: req.params.id  ,name : data[0].name });
        }
        else {
            const c = await Class.create({
                class_name: req.body.class_name,
                joining_id: req.body.joining_id,
                fc_name: g.fc_name,
                fc_id: g.fc_id,
            });
            const url = "/assignment/" + c._id + "/" + req.params.id + "/";
            res.redirect(url);
        }
    }
    catch (e) {
        console.log("Error", e);
    }
});

// Pagina para ver los estudiantes de la asignatura - PRIVADO
router.get("/show-students/:cid/",accessFaculty, async (req, res) => {
    try {
        var cid = req.params.cid;
        const data = await Class.findById(cid);
        var id = data.fc_id;
        var name = data.fc_name;
        res.render("./faculty/faculty_students", { data: data.students, cid: cid , id : id  , fc_name : name});
    }
    catch (e) {
       console.log("Error" , e);
    }
});

// Pagina para ver las asignaturas - TODOS
router.get("/show-classes/:id/", async (req, res) => {
    try{
    var id = req.params.id;
    const f_classes = await Class.find({ "fc_id": req.params.id });
    const s_classes = await Class.find({ st_id:
        {
            $elemMatch:
            {
                st_id: req.params.id
            }
        }});
        console.log("yha tak to");
        //res.send("vuk");
    res.render("./faculty/classes.ejs" , {  s_classes : s_classes  , f_classes: f_classes  , id :id});
    }
    catch(e){
        console.log("Error" , e);
    }
});

// RUTA-GET para eliminar a un estudiante de la asignatura
router.get("/student-remove/:id/:cid/:sid/",accessFaculty, async (req, res) => {
    var id = req.params.id;
    var cid = req.params.cid;
    try {
         var data = await Class.findById(cid);
         data = await data.st_id;
        await Class.findOneAndUpdate({ "_id": cid },
            {
                $pull:
                    { "students": { _id: id },
                       "st_id" : {st_id : req.params.sid}
                    }
            })
    }
    catch (e) {
        console.log("Error", e);
    }
    const url = "/assignment/show-students/" + cid + "/";
    res.redirect(url);
});

// RUTA-GET para eliminar un post de la asignatura
router.get("/delete-msg/:cid/:id/:uid/",accessFaculty, async (req , res)=>{
    try{
        var id = req.params.id;
        var cid = req.params.cid;
        var uid = req.params.uid;
        await Class.findOneAndUpdate({ "_id": cid },
            {
                $pull:
                    { "discussion": { _id: id } }
            })
    }
    catch(e){
        console.log("Error" , e);
    }
    var url = "/assignment/" + cid + "/" + uid + "/";
    res.redirect(url);
});

// Pagina para ver la revision de la tarea - PRIVADO
router.get("/Show-submitted-hw/:aid/:cid/",accessFaculty, async (req , res)=>{
    var aid = req.params.aid;
    var cid = req.params.cid;
    //var hid = req.params.hid;
    try{
        var data = await Class.find({ assignments:
            {
                $elemMatch:
                {
                     _id : aid
                }
            }});
            var id = data[0].fc_id;
            var name;
        hdata = data[0].assignments;
        for(var i=0 ; i<hdata.length ; i++){
            if(hdata[i]._id == aid){
                name = hdata[i].title;
                hdata = hdata[i].homework;
                break;
            }
        }
        console.log(hdata);

        res.render("./faculty/faculty_submitted_hw" , {data : hdata , cid : cid , aid : aid , id:id , title : name});
    }
    catch(e){
     console.log("Error" , e)   
    }
});

// RUTA-POST para dar nota a la tarea
router.post("/marking/:aid/:cid/:hid/",accessFaculty, async (req , res)=>{
    var aid = req.params.aid;
    var cid = req.params.cid;
    var hid = req.params.hid;
    try{
        var hw_details , filename , st_name , st_id;
        var hdata = await Class.findById(cid);
        hdata = hdata.assignments;
        for(var i=0 ; i<hdata.length ; i++){
            if(hdata[i]._id == aid){
                hdata = hdata[i].homework;
                break;
            }
        }
        var i;
        for( i=0 ; i<hdata.length ; i++){
            if(hdata[i]._id == hid){
                hw_details = hdata[i].hw_details;
                filename = hdata[i].h_filename;
                st_name = hdata[i].st_name;
                st_id = hdata[i].st_id;
                break;
            }
        }
        var data = await Class.updateOne(
            { "_id": cid, "assignments._id": req.params.aid},
            { "$pull": 
                {"assignments.$[].homework": 
                    {
                        "_id" : hid
                    }
                }
             }
        );
        var data = await Class.updateOne(
            { "_id": cid, "assignments": {"$elemMatch" : {"_id" : req.params.aid}}},
            { "$push": 
                {"assignments.$.homework": 
                    {   
                        "checked" : 1,
                        "marks" : req.body.marks,
                        "st_name" : st_name,
                        "st_id": st_id,
                        "hw_details": hw_details,
                        "h_filename" : filename
                    }
                }
             }
            )
            console.log(data);
            const url = "/assignment/Show-submitted-hw/" + aid + "/" + cid + "/";
            res.redirect(url);
    }
    catch(e)
    {
        console.log("Error" , e);
    }
});

//Pagina dashboard del profesor - PRIVADO
router.get("/:cid/:id/",accessFaculty, async (req, res) => {
    try{
    var cid = req.params.cid;
    var id = req.params.id;
    var data = await Class.findById(cid);
    var name = data.class_name;
    var jd = data.joining_id;
    var discussions = data.discussion;
    res.render("./faculty/faculty_dashboard.ejs", { 
        data : data,
        cid: cid  ,
        id : req.params.id ,
        discussions : discussions ,
        name : name,
        jd : jd
    });
}
    catch(e){
        console.log("Error" , e);
    }
});

module.exports = router;