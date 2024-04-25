
const homeController = require("../controllers/homeController");
const managerController = require("../controllers/managerController");
const middlewareController = require("../controllers/middlewareController");
const testController = require("../controllers/testController");

const router = require("express").Router();

router.get('/',middlewareController.checkLogOutUser, homeController.loginUser);
router.get('/loginUser', middlewareController.checkLogOutUser ,homeController.loginUser);
router.post('/loginFunction', homeController.login);
router.get('/homePage', middlewareController.verifyUser, homeController.loginedHome);

router.get('/blogByFaculty', middlewareController.verifyUser,testController.blogByFaculty);
router.get('/academy/info/:id', middlewareController.verifyUser, testController.getAcademyInfo);
router.get('/addBlog/:id', middlewareController.verifyUser, testController.addBlogSite);
router.post('/uploadBlog/:id', middlewareController.verifyUser,testController.addBlog);

router.get('/blogList/:id', middlewareController.verifyUser,testController.blogList);
router.get('/byStatus/:id', middlewareController.verifyUser,testController.findByStatus);
router.get('/byStatus', middlewareController.verifyUser,testController.chooseStatus);
router.get('/logout', middlewareController.verifyUser,homeController.logout);
router.get('/changeStatus/:id',middlewareController.verifyUser,testController.approveBlog);
router.get('/blogDetails/:id', middlewareController.verifyUser , testController.blogDetails);
router.post('/addComment/:id', middlewareController.verifyUser, testController.addComment);
router.get('/editBlog/:id', middlewareController.verifyUser, testController.editBlogSite);
router.get('/download/:id',middlewareController.verifyUser, testController.downloadFile);
router.post('/updateBlog/:id', middlewareController.verifyUser, middlewareController.multerErrorHandler, testController.updateBlog);
router.get('/deleteAFile/:id', middlewareController.verifyUser, testController.deleteOneFile );

router.get('/myBlog', middlewareController.verifyUser, testController.usersBlog);
router.get('/listUserBlog/:id', middlewareController.verifyUser, testController.selectAcademy);
router.get('/filterBlog/:id', middlewareController.verifyUser, testController.filterStatus);
router.get('/filterBlog', middlewareController.verifyUser, testController.statusWithFaculty);
router.get('/viewFile/:id', middlewareController.verifyUser, testController.viewFile);

//manager

router.get('/managerViewBlogs', middlewareController.verifyUser, managerController.listBlog);

router.get('/selectFaculty/:facultyId', middlewareController.verifyUser, managerController.selectFaculty);
router.get('/selectFaculty/:facultyId/:academyId', middlewareController.verifyUser, managerController.selectAcademy);
router.get('/selectFaculty/:facultyId/listUserBlog/:academyId', middlewareController.verifyUser, managerController.selectAcademy);
router.get('/selectedAcademy/:academyId', middlewareController.verifyUser, managerController.selectAcademyOnly);
router.get('/filterBlog/:facultyId/:academyId', middlewareController.verifyUser, managerController.filterStatus);
router.get('/filterBlogFaculty/:id', middlewareController.verifyUser, managerController.FacultyWStatus);
router.get('/filterBlogAcademy/:id', middlewareController.verifyUser, managerController.AcademyWStatus);
router.get('/selectStatus', middlewareController.verifyUser, managerController.selectStatus);

router.get('/listGuest', middlewareController.verifyUser, managerController.listGuest);
router.get('/addGuestSite', middlewareController.verifyUser, managerController.addGuestSite);
router.post('/addGuest', middlewareController.verifyUser, managerController.addGuest);
router.get('/deleteGuest/:id', middlewareController.verifyUser, managerController.deleteGuest);
router.get('/editGuest/:id', middlewareController.verifyUser, managerController.editGuestSite);
router.post('/updatedGuest/:id', middlewareController.verifyUser, managerController.updateGuest);

// Profiles

router.get('/userProfiles', middlewareController.verifyUser, testController.userProfiles);
router.get('/userEditProfile', middlewareController.verifyUser, testController.userEdit);

router.post('/updateChart', middlewareController.verifyUser ,homeController.updateChart);

module.exports = router;