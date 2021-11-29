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
const {Class} = require("../models/Schema");
const user = require("../models/User");

const {accessStudent} = require("../config/auth");

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

//Pagina para enviar la tarea
router.get("/classwork/:id/:cid/:aid/",accessStudent, async (req, res) => {
    res.render("./student/create_homework.ejs", { id: req.params.id, cid: req.params.cid, aid: req.params.aid });
});

//RUTA-POST para enviar tarea
router.post("/home-create/:id/:cid/:aid/",accessStudent, upload.single("file"), async (req, res) => {
    var filename = req.file.filename;
    const cid = req.params.cid;
    try {
        var udata = await user.findById(req.params.id);
        var name = udata.name;
        console.log(udata);
        var data = await Class.updateOne(
            { "_id": cid, "assignments": { "$elemMatch": { "_id": req.params.aid } } },
            {
                "$push":
                {
                    "assignments.$.homework":
                    {
                        "st_name": name,
                        "st_id": req.params.id,
                        "hw_details": req.body.h_name,
                        "h_filename": filename
                    }
                }
            }
        )
        console.log(data);
    }
    catch (e) {
        console.log("Error", e);
    }
    const url = "/homework/assignments/"  + req.params.id + "/" + cid + "/";
    //console.log("hjbkvvkv");
    console.log(url);
    res.redirect(url);
});

//Pagina para el archivo enviado
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


router.post("/home-delete/:aid/:cid/:hid/", async (req, res) => {
    var uid;
    try {
        var aid = req.params.aid;
        var cid = req.params.cid;
        var hid = req.params.hid;
        var hdata = await Class.find({
            "assignments.homework._id": req.params.hid
        });
        uid = hdata[0].assignments[0].homework[0].st_id;
        var data = await Class.updateOne(
            { "_id": cid, "assignments._id": req.params.aid },
            {
                "$pull":
                {
                    "assignments.$[].homework":
                    {
                        "_id": hid
                    }
                }
            }
        );
    }
    catch (e) {
        console.log("Error", e);
    }
    const url = "/homework/home-show/" + cid + "/" + uid + "/";
    res.redirect(url);
});

//Pagina para ver las calificaciones de las tareas
router.get("/home-show/:cid/:id/",accessStudent, async (req, res) => {
    try {
        var cid = req.params.cid;
        const data = await Class.find({ "_id": cid });
        const ad = await data[0].assignments;
        res.render("./student/submitted_homework.ejs", { data: ad, cid: cid, id: req.params.id });
    }
    catch (e) {
        console.log("Error", e);
    }
});

//Pagina para ver las tareas
router.get("/assignments/:id/:cid/",accessStudent, async (req, res) => {
    try {
        var data = await Class.findById(req.params.cid);
        data = data.assignments;
        res.render("./student/student_classwork", {
            data: data,
            id: req.params.id,
            cid: req.params.cid
        });
    }
    catch{
        console.log("Error", e);
    }
});

//Pagina para ingresar a una asignatura
router.get("/join-class/:id/", async (req, res) => {
    try {
        const data = await user.findById(req.params.id);
        var name = data.name;
        console.log(name);
        res.render("./student/join-class", { id: req.params.id  , name : name });
    } catch (e) {
        console.log("Error", e);
    }
});

//RUTA-POST para entrar a una asignatura
router.post("/join-class/:id/",accessStudent, async (req, res) => {
    var joining_id = req.body.joining_id;
    var id = req.params.id;
    try {
        console.log("id" , id);
        var u_data = await user.findById(id);
        const data = await Class.find({ joining_id: joining_id });
        console.log(data);
        if (data.length > 0) {
            var fc = data[0].fc_id;
            var name = data[0].class_name;
            var check = 0;
            for(var i=0 ; i<data[0].st_id.length ; i++){
                if(data[0].st_id[i].st_id == id){
                    check = 1;
                }
            }
            console.log("check" , check);
            if (check == 0) {
                console.log(fc);
                console.log(id);
                if (fc !== id) {
                    console.log("achha");
                    await Class.findOneAndUpdate({ joining_id: joining_id },
                        {
                            $push:
                            {
                                "st_id": [{
                                    "st_id": u_data._id,
                                }],
                                "students": [{
                                    "st_name": u_data.name,
                                    "st_id": u_data._id
                                }]
                            }
                        });
                    const data = await Class.find({ joining_id: joining_id });
                    console.log(data);
                    res.render("./student/student_dashboard" , {data : data ,
                         discussions : data[0].discussion ,
                          cid : data[0]._id ,
                          name : name,
                           id : id});
                }
                else {
                    res.send("You are the teacher itself");
                }
            }
            else {
                res.send("You are already enrolled")
            }
        }
        else {
            res.send("oops wrong joining id");
        }
    }
    catch (e) {
        console.log("Error", e);
    }
});

//RUTA-GET para borrar comentario
router.get("/delete-msg/:cid/:id/:uid/",accessStudent, async (req , res)=>{
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
    var url = "/homework/" + cid + "/" + uid + "/";
    res.redirect(url);
});

// Pagina para ver estudiantes de la asignatura
router.get("/show-classmates/:cid/:uid",accessStudent, async (req , res)=>{
    try {
        var cid = req.params.cid;
        const data = await Class.findById(cid);
        var id = data.st_id;
        var name = data.fc_name;
        res.render("./student/student_people", { data: data.students, cid: cid , id : req.params.uid  , fc_name : name});
    }
    catch (e) {
       console.log("Error" , e);
    }
  });

//Pagina dashboard del estudiante
router.get("/:cid/:id/",accessStudent, async (req, res) => {
    var cid = req.params.cid;
    var id = req.params.id;
    console.log(id);
    try {
        var data = await Class.findById(cid);
        var discussions = data.discussion;
        var name = data.class_name;
        res.render("./student/student_dashboard", { 
            data: data,
             discussions : discussions ,
             id: id,
              cid: cid,
            name : name });
    }
    catch (e) {
        console.log("Error", e);
    }
});


module.exports = router;