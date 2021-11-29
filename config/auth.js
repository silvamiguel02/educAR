const {Class} = require('../models/Schema');

const ensureAuthenticated = async(req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error_msg', 'Necesitas iniciar sesion primero');
  res.redirect('/login');
}

const forwardAuthenticated = async(req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/dashboard');
}

const accessFaculty = async(req, res, next) => {
  var _id = req.params.cid;
  var cidClass = await Class.findById({_id});
  if(req.user._id == cidClass.fc_id){
    return next();
  }
  req.flash('error_msg', 'Usted no tiene acceso a esta ruta')
  res.redirect('/dashboard')
}

const accessStudent = async(req, res, next) => {
  var _id = req.params.cid;
  const data = await Class.findById({_id});
  const students = data.st_id;
  var isStudent = false;
  students.forEach(element => {
    if(element.st_id == req.user._id){
      isStudent = true;
    }
  });
  if(isStudent){
    return next();
  }
  req.flash('error_msg', 'Usted no tiene acceso a esta ruta')
  res.redirect('/dashboard')
}

module.exports = {
    ensureAuthenticated,
    forwardAuthenticated,
    accessFaculty,
    accessStudent
};
  