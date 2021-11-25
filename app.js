const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const expressLayouts = require('express-ejs-layouts');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');

//Routes path
const Routes = require("./routes/routes");
const authRoute = require("./routes/auth.routes");
const assignmentRoute = require("./routes/assignment.routes");
const homeworkRoute = require("./routes/homework.routes");




const app = express();
dotenv.config();

// Passport Config
require('./config/passport')(passport);

mongoose.connect(
    process.env.MONGO_URL,
    { useNewUrlParser: true, useUnifiedTopology: true },
    () => {
      console.log("Conectado correctamente a la BD");
    }
);

app.use(express.static("public"));

//ejs
app.use(expressLayouts);
app.set('view engine', 'ejs');

// Express body parser
app.use(express.urlencoded({ extended: true }));

// Express session
app.use(
    session({
      secret: 'secret',
      resave: true,
      saveUninitialized: true
    })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

//middleware
app.use(express.json());
app.use(helmet());
app.use(morgan("common"));

//routes
app.use("/",Routes);
app.use("/auth",authRoute);
app.use("/assignment",assignmentRoute);
app.use("/homework",homeworkRoute);

app.listen(8800, () => {
    console.log('REST-API esta en funcionamiento')
});