const adminController = require("../controllers/adminController");
const homeController = require("../controllers/homeController");
const middlewareController = require("../controllers/middlewareController");
const testController = require("../controllers/testController");
const admin = require("../models/admin");

const router = require("express").Router();

router.get('/dashboard',middlewareController.verifyToken, adminController.dashboard);
router.get('/loginAdmin', middlewareController.checkLogOutAdmin ,adminController.loginAdmin);
router.get('/registerAdmin', adminController.registerAdmin);
router.post('/register', adminController.register);
router.get('/listUser',middlewareController.verifyToken,adminController.listUser);
router.post('/addStudent',adminController.addUser);
router.get('/edit/:id', adminController.edit);
router.post('/update/:id', adminController.updated);
router.get('/delete/:id', adminController.delete);
router.post('/refresh', adminController.reqRefreshToken);
router.get('/signOut', homeController.logout);
router.get('/student', adminController.listStudents);
router.get('/coordinator', adminController.listCoordinators);
router.get('/manager', adminController.listManagers);
router.get('/listFaculty', adminController.listFaculty);
router.post('/addFaculty', adminController.addFaculty);
router.get('/listTerms', adminController.termsAndConditions);
router.post('/addTerms', adminController.addTermsAndConditions);
router.get('/deleteTerm/:id', adminController.deleteTerms);

router.get('/academy', testController.academySite);
router.get('/addAcademy', testController.newAcademy);
router.post('/addAcademy', testController.addAcademy);
router.get('/deleteAcademy/:id', middlewareController.verifyToken ,adminController.deleteAcademy);
router.get('/editAcademy/:id', middlewareController.verifyToken, adminController.editAcademySite);
router.post('/updateAcademy/:id', middlewareController.verifyToken, adminController.editAcademy);
router.get('/deleteFaculties/:id', middlewareController.verifyToken, adminController.deleteFaculty);
router.get('/editFaculties/:id', middlewareController.verifyToken, adminController.editFaculty);
router.post('/updatedFaculty/:id', middlewareController.verifyToken, adminController.updatedFaculty);


module.exports = router;