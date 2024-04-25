const bcrypt = require('bcryptjs');
const { User, roles } = require('../models/user');
const multer = require('multer');
const fs = require('fs');

const Academy = require('../models/academy');
const Blog = require('../models/blog');
const Faculty = require('../models/faculty');


// upload image
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, "./uploads");
    },
    filename: function(req, file, cb) {
        // Generate a unique filename using the fieldname, current timestamp, and original filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '_' + uniqueSuffix + '_' + file.originalname);
    }
});

const upload = multer({
    storage: storage
}).single("image");

const managerController = {
    listBlog: async (req, res) => {
        try{
            const userId = req.userId;
            const user = await User.findById(userId).exec();
            const academy = await Academy.find();
            const faculty = await Faculty.find();

            let blogs = [];
            let statuses = [];
            if(user.role === 'manager') {
                blogs = await Blog.find().populate('faculty academy user');
                statuses = blogs.map(blog => blog.status);

            } else if(user.role === 'guest') {
                blogs = await Blog.find({status: 'publish'}).populate('faculty academy user');
                statuses = blogs.map(blog => blog.status);
            }

            res.render('users/managerView', {
                title: "Manager Views",
                user: user,
                academy: academy,
                selectedAcademy: null,
                selectedFaculty:null,
                faculty: faculty,
                blogs: blogs,
                statuses: statuses,
            });
        } catch (err) {
            res.status(500).json({ error: 'Internal server error' });
        }

    },

    selectFaculty: async(req, res) => { 
        try{
            const userId = req.userId;
            const user = await User.findById(userId).exec();
            const facultyId = req.params.facultyId;
            const faculties = await Faculty.findById(facultyId);

            const faculty = await Faculty.find()
            const academy = await Academy.find();
            const blogs = await Blog.find({faculty: facultyId}).populate('faculty academy user');
            const statuses = blogs.map(blog => blog.status);

            res.render('users/managerView', {
                title: "Manager Views",
                user: user,
                academy: academy,
                selectedAcademy: null,
                selectedFaculty: faculties,
                faculty: faculty,
                facultyId: facultyId,
                blogs: blogs,
                statuses: statuses
            });
        } catch(err) {
            res.status(500).json({ err: 'Internal server error' });
        }
    },
    FacultyWStatus: async (req,res) => {
        try{
            const userId = req.userId;
            const user = await User.findById(userId).exec();
            const facultyId = req.params.id;
            const faculties = await Faculty.findById(facultyId);
            const status = req.query.status;

            const faculty = await Faculty.find()
            const academy = await Academy.find();
            const blogs = await Blog.find({faculty: facultyId, status: status}).populate('faculty academy user');

            res.render('users/managerView', {
                title: "Manager Views",
                user: user,
                academy: academy,
                selectedAcademy: null,
                selectedFaculty: faculties,
                faculty: faculty,
                facultyId: facultyId,
                blogs: blogs,
                statuses: status,
            });
        } catch(err) {
            res.status(500).json({ err: 'Internal server error' });
        }
    },
    selectAcademy: async (req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId).exec();

            const { facultyId, academyId } = req.params;
            const faculties = await Faculty.findById(facultyId);
            const academies = await Academy.findById(academyId);

            const faculty = await Faculty.find()
            const academy = await Academy.find();

            const blogs = await Blog.find({faculty: facultyId, academy: academyId}).populate('faculty academy user');
            const statuses = blogs.map(blog => blog.status);

            res.render('users/managerView', {
                title: "Manager Views",
                user: user,
                academy: academy,
                selectedAcademy: academies,
                selectedFaculty: faculties,
                faculty: faculty,
                facultyId: facultyId,
                academyId: academyId,
                blogs: blogs,
                statuses: statuses,
            });
        } catch (err) {
            res.status(500).json({ err: 'Internal server error' });
        }
    },

    selectAcademyOnly: async (req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId).exec();

            const { academyId } = req.params;

            const academies = await Academy.findById(academyId);

            const faculty = await Faculty.find()
            const academy = await Academy.find();

            const blogs = await Blog.find({ academy: academyId }).populate('faculty academy user');
            const statuses = blogs.map(blog => blog.status);

            res.render('users/managerView', {
                title: "Manager Views",
                user: user,
                academy: academy,
                selectedAcademy: academies,
                selectedFaculty: null,
                faculty: faculty,
                blogs: blogs,
                academyId: academyId,
                statuses: statuses,
            });
        } catch(err) {
            res.status(500).json({ err: 'Internal server error' });
        }
    },
    AcademyWStatus: async (req, res) => {
        try {
            const userId = req.userId;
            const status = req.query.status;
            const user = await User.findById(userId).exec();

            const academyId  = req.params.id;

            const academies = await Academy.findById(academyId);

            const faculty = await Faculty.find()
            const academy = await Academy.find();

            const blogs = await Blog.find({ academy: academyId, status: status }).populate('faculty academy user');

            res.render('users/managerView', {
                title: "Manager Views",
                user: user,
                academy: academy,
                selectedAcademy: academies,
                selectedFaculty: null,
                faculty: faculty,
                blogs: blogs,
                academyId: academyId,
                statuses: status,
            });
        } catch(err) {
            res.status(500).json({ err: 'Internal server error' });
        }
    },

    selectStatus: async(req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId);

            const academy = await Academy.find();
            const faculty = await Faculty.find();
            const status = req.query.status;
            if (!status) {
                throw new Error("Status parameter is missing");
            }
            const blogs = await Blog.find({status: status}).populate('faculty academy user');

            res.render('users/managerView', {
                title: "Manager View",
                blogs: blogs,
                selectedAcademy: null,
                user: user,
                academy: academy,
                faculty: faculty,
                statuses: status,
                selectedFaculty: null,
            });
        } catch(err) {
            res.status(500).json({ err: 'Internal server error' });
        }
    },

    filterStatus: async (req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId);

            const { facultyId, academyId } = req.params;
            const status = req.query.status;

            if (!status) {
                throw new Error("Status parameter is missing");
            }

            const blogs = await Blog.find({ academy: academyId, status: status, faculty: facultyId }).populate('faculty academy user');
            const academies = await Academy.findById(academyId).exec();
            const faculties = await Faculty.findById(facultyId).exec();
            const academy = await Academy.find();
            const faculty = await Faculty.find()

            res.render('users/managerView', {
                title: "Manager View",
                blogs: blogs,
                selectedAcademy: academies,
                user: user,
                academy: academy,
                faculty: faculty,
                facultyId: facultyId,
                academyId: academyId,
                selectedFaculty: faculties,
                statuses: status,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    listGuest: async(req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId);
            const facultyId = user.faculty;

            const guest = await User.find({role: 'guest', faculty: facultyId}).populate('faculty');

            res.render('users/guestList', {title: 'List Guest', guest: guest, user: user});
        } catch(err) {
            res.status(500).json({ message: err.message });
        }
    },

    addGuestSite: async (req, res) => {
        try{
            const userId = req.userId;
            const user = await User.findById(userId).populate('faculty');
            const blogs = await Blog.find({faculty: user.faculty._id, status: 'publish'}).populate('faculty');

            res.render('users/guestAddSite', {title: 'Add New Guest', user: user, blogs: blogs});
        } catch(err) {
            res.status(500).json({ message: err.message });
        }
    },

    addGuest: async (req, res) => {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ message: err.message, type: "danger" });
            }
            const userId = req.userId;
            const user = await User.findById(userId).populate('faculty');
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(req.body.password, salt);
            try {
                const newUser = new User({
                    username: req.body.username,
                    email: req.body.email,
                    password: hashed,
                    role: 'guest',
                    faculty: user.faculty,
                    image: req.file ? req.file.filename : null,
                    phoneNumber: req.body.phoneNumber,
                    gender: req.body.gender,
                    city: req.body.city,
                });
                
                await newUser.save();

                const selectedBlogs = req.body.selectedBlogs; 
                await User.findByIdAndUpdate(newUser._id, { selectedBlogs: selectedBlogs });
    
                req.session.message = {
                    type: "success",
                    message: "Guest Added Successfully"
                };
                res.redirect("/addGuestSite");
            } catch (err) {
                console.log(err);
                res.status(500).json({ message: err.message, type: "danger" });
            }
        });
    },
    
    deleteGuest: async (req, res) => {
        const id = req.params.id;
        try {
            const user = await User.findOneAndDelete({ _id: id }).exec();
            if (!user) {
                req.session.message = {
                    type: 'error',
                    message: 'User not found',
                };
                return res.redirect('back');
            }
            if (user.image !== '') {
                try {
                    fs.unlinkSync('./uploads/' + user.image);
                } catch (err) {
                    console.log(err);
                }
            }
            req.session.message = {
                type: 'info',
                message: 'User deleted Successfully!',
            };
            res.redirect('/listGuest');
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },

    editGuestSite: async (req, res) => {
        try {
            const userId = req.userId;
            const manager = await User.findById(userId).exec();
            const id = req.params.id;
            const user = await User.findById(id).populate('selectedBlogs').exec();
            const blogs = await Blog.find({faculty: user.faculty._id, status: 'publish'}).populate('faculty');
            
            if (!user) {
                return res.redirect('/listGuest');
            }
            res.render("users/guestEditSite", {
                title: "Edit Guest",
                users: user,
                user: manager,
                id: id,
                blogs: blogs,
                selectedBlogs: user.selectedBlogs.map(blog => blog._id.toString())
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },

    updateGuest: async (req, res) => {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ message: err.message, type: "danger" });
            }
            const id = req.params.id;
            const userId = req.userId;
            const user = await User.findById(userId).populate('faculty');
            const selectedBlogs = req.body.selectedBlogs;

            let new_image = "";
        
            if (req.file) {
                new_image = req.file.filename;
                try {
                    fs.unlinkSync("./uploads/" + req.body.old_image);
                } catch (err) {
                    console.log(err);
                }
            } else {
                new_image = req.body.old_image;
            }
        
            let hashed = req.body.password; 
            if (req.body.new_password) { 
                const salt = await bcrypt.genSalt(10);
                hashed = await bcrypt.hash(req.body.new_password, salt); 
            }
        
            try {
                let updatedFields = {
                    username: req.body.username,
                    email: req.body.email,
                    role: 'guest',
                    faculty: user.faculty,
                    image: new_image,
                    phoneNumber: req.body.phonenumber,
                    gender: req.body.gender,
                    city: req.body.city,
                };
            
                if (req.body.new_password) {
                    const salt = await bcrypt.genSalt(10);
                    updatedFields.password = await bcrypt.hash(req.body.new_password, salt);
                } else {
                    updatedFields.password = req.body.password;
                }
            
                const result = await User.findByIdAndUpdate(id, updatedFields, { new: true }).exec();

                await User.updateOne({ _id: result._id }, { $set: { selectedBlogs: selectedBlogs } });

                req.session.message = {
                    type: "success",
                    message: 'User Updated successfully',
                };
                res.redirect(`/editGuest/${id}`);
            } catch (err) {
                console.error(err);
                res.json({ message: err.message, type: 'danger' });
            }
        })
    },
};

module.exports = managerController;