const bcrypt=require('bcryptjs');
const Admin = require('../models/admin');
const {User, roles} = require('../models/user');
const Faculty = require('../models/faculty');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Cookie } = require('express-session');
const multer = require('multer');
const Terms = require('../models/terms');
const Academy = require('../models/academy');
const Blog = require('../models/blog');
const fs = require('fs');


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



let refreshTokens = [];
const adminController = {
    loginAdmin: (req, res) => {
        res.render('administration/loginAdminSite', {title: 'Admin Login'});
    },
    registerAdmin: (req, res) => {
        res.render('administration/registerAdminSite', {title: 'Admin Reister'});
    },
    register: async(req, res) => {
        const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(req.body.password, salt);
            const newAdmin = await new Admin({
                username: req.body.username,
                email: req.body.email,
                password: hashed,
            });

        try {
            await newAdmin.save();

            req.session.message = {
                type: "success",
                message: "User Added Successfully"
            };
            res.redirect("/loginAdmin");
        } catch(err) {
            res.status(500).json({ message: err.message, type: "danger" });
        }
    },
    dashboard: async(req, res) => {
        try {
            const adminId = req.adminId;
            const admin = await Admin.findById(adminId);

            const blogCounts = await Blog.aggregate([
                { $group: { _id: "$faculty", count: { $sum: 1 } } },
                { $lookup: { from: 'faculties', localField: '_id', foreignField: '_id', as: 'faculty' } },
                { $unwind: "$faculty" }
            ]);
            
            let chartConfig;
            const labels = [];
            const data = [];

            blogCounts.forEach(blog => {
                labels.push(blog.faculty.name);
                data.push(blog.count);
            });
            chartConfig = {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Number of Contribution',
                            data: data,
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        },
                    ]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                precision: 0 
                            }
                        }
                    }
                }
            };
            res.render('administration/dashboard', {title: "Admin Dashboard", admin: admin, chartConfig: chartConfig});
        } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    
    generateAccessToken: (admin) => {
        return jwt.sign({
            id: admin.id,
            isAdmin: admin.isAdmin,
            token:admin
            
        },
            process.env.JWT_ACCESS_TOKEN,
            {
                expiresIn: "30d"
            }
        );
    },
    
    generateRefreshToken: (admin) => {
        return jwt.sign({
            id: admin.id,
            isAdmin: admin.isAdmin,
            token: admin,
        },
            process.env.JWT_REFRESH_KEY,
            {
                expiresIn: "365d"
            }
        );
    },
    addFaculty: async (req, res) => {
        try {
            const newFaculty = new Faculty({
                name: req.body.name,
            });
            await newFaculty.save();
            
            req.session.message = {
                type: "success",
                message: "Add Faculty Successfully",
            }
            res.redirect('/listFaculty');
        } catch (error) {
            req.session.message = {
                type: "success",
                message: "Fail Add Faculty",
            }
            res.redirect('/listFaculty');
        }
    },

    listFaculty: async(req, res) => {
        try {
            const faculties = await Faculty.find();
            const admin = await Admin.findOne();
            res.render('administration/listFaculty', { title: 'Faculty', faculties: faculties, admin: admin });
        } catch (err) {
            res.status(500).json({ message: "Internal Server Error"});
        }
    },

    listUser: async(req, res) => {
        try {
            const admin = await Admin.findOne();
            const faculties = await Faculty.find({}, '_id name');
            res.render('administration/listUser', { title: 'Add New Users', admin: admin, roles: roles, faculties: faculties }); 
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },

    listStudents: async(req, res) => {
        try {
            const users = await User.find({role:"student"}).populate('faculty');
            const admin = await Admin.findOne(); 
            res.render('administration/students', { title: 'Students', users: users, admin: admin }); 
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    listCoordinators: async(req, res) => {
        try {
            const users = await User.find({role:"coordinator"}).populate('faculty');
            const admin = await Admin.findOne(); 
            res.render('administration/coordinators', { title: 'Marketing Coordinators', users: users, admin: admin }); 
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    listManagers: async(req, res) => {
        try {
            const users = await User.find({role:"manager"});
            const admin = await Admin.findOne(); 
            res.render('administration/managers', { title: 'Marketing Manager', users: users, admin: admin });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    
    addUser: async (req, res) => {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ message: err.message, type: "danger" });
            }
    
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(req.body.password, salt);
            try {
                const newUser = await new User({
                    username: req.body.username,
                    email: req.body.email,
                    password: hashed,
                    role: req.body.role,
                    faculty: req.body.role === "manager" ? null : req.body.faculty,
                    image: req.file ? req.file.filename : null, 
                    phoneNumber: req.body.phoneNumber,
                    gender: req.body.gender,
                    city: req.body.city,
                });

                if (req.body.role !== "manager" && !req.body.faculty) {
                    req.session.message = {
                        type: "danger",
                        message: "Please select a faculty",
                    };
                    return res.redirect('/listUser');
                }
                if (!req.body.role) {
                    req.session.message = {
                        type: "danger",
                        message: "Please select a Role",
                    };
                    return res.redirect('/listUser');
                }
                const existingEmail = await User.findOne({ email: req.body.email });
                if (existingEmail) {
                    req.session.message = {
                        type: "danger",
                        message: "Email already exists",
                    };
                       return res.redirect('/listUser')
                }

                const existingPhoneNumber = await User.findOne({ phoneNumber: req.body.phoneNumber });
                if (existingPhoneNumber) {
                    req.session.message = {
                        type: "danger",
                        message: "Phone Number already exists",
                    }
                    return res.redirect('/listUser');
                }

                if(existingEmail && existingPhoneNumber) {
                    
                        req.session.message = {
                            type: "danger",
                            message: "Email and Phone Number already exists",
                        }
                       return res.redirect('/listUser')
                }
                await newUser.save();
                req.session.message = {
                    type: "success",
                    message: "User Added Successfully"
                };
                res.redirect("/listUser");
            } catch (err) {
                console.log(err);
                res.status(500).json({ message: err.message, type: "danger" });
            }
        });
    },
    
    

    edit: async (req, res) => {
        try {
            const admin = await Admin.findOne();
            const id = req.params.id;
            const user = await User.findById(id).populate('faculty').exec();
            const faculties = await Faculty.find({}, '_id name');
            
            if (!user) {
                return res.redirect('/listUser');
            }
            res.render("administration/editUser", {
                title: "Edit User",
                user: user,
                admin: admin,
                id: id,
                faculties: faculties,
                roles: roles,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    updated: async (req, res) => {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ message: err.message, type: "danger" });
            }
            const id = req.params.id;
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
                const faculty = req.body.faculty ? req.body.faculty : null;
                const result = await User.findByIdAndUpdate(id, {
                    username: req.body.username,
                    email: req.body.email,
                    password: hashed, 
                    role: req.body.role,
                    faculty: faculty,
                    image: new_image, 
                    phoneNumber: req.body.phoneNumber,
                    gender: req.body.gender,
                    city: req.body.city,
                }).exec();
        
                req.session.message = {
                    type: "success",
                    message: 'User Updated successfully',
                };
                res.redirect('/listUser');
            } catch (err) {
                console.error(err);
                res.json({ message: err.message, type: 'danger' });
            }
        })
    },
    delete: async (req, res) => {
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
            res.redirect('/student');
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    
    

    reqRefreshToken: async(req, res) => {
        const refreshToken = req.cookie.refreshToken;
        if(!refreshToken) return res.status(401).json("You are not authenticated");
        if(!refreshTokens.includes(refreshToken)) {
            return res.status(403).json("Refresh Token is not valid");
        }
        jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY, (err, admin)=> {
            if(err){
                console.log(err);
            }
            refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
            // create new accesstoken, refreshtoken,
            const newAccessToken = adminController.generateAccessToken(admin);
            const newRefreshToken = adminController.generateRefreshToken(admin);
            refreshTokens.push(newRefreshToken);
            res.cookie("refreshToken", newRefreshToken);

            res.status(200).json({accessToken: newAccessToken});
        })
    },

    logout: async (req, res) => {
        try {
            res.clearCookie("refreshToken");
            refreshTokens = refreshTokens.filter(token => token !== req.cookies.refreshToken);
            res.clearCookie("accessToken");
            res.redirect("/loginAdmin");
        } catch (err) {
            console.log(err);
            res.status(500).json({ message: err.message, type: "danger" });
        }
    },

    termsAndConditions: async(req, res) => {
        const admin = await Admin.findOne();
        const terms = await Terms.find();
        res.render('administration/listTerms', {title: "Terms And Conditions", admin: admin, terms: terms});
    },

    addTermsAndConditions: async (req, res) => {
        try {
            // Tạo một bản ghi mới của TermsAndConditions
            const newTermsAndConditions = new Terms({
                content: req.body.termContent, // Sử dụng req.body.termContent thay vì req.body.content
            });
    
            // Lưu bản ghi vào cơ sở dữ liệu
            await newTermsAndConditions.save();
            
            req.session.message = {
                message: 'Terms and conditions added successfully',
                type: "success"
            }
            res.redirect('/listTerms')
        } catch (error) {
            req.session.message = {
                message: 'Terms and conditions added Fail',
                type: "danger"
            }
            res.redirect('/listTerms')
        }
    },
    // Delete Faculty
    deleteFaculty: async (req, res) => {
        const id = req.params.id;
        try {
            const faculty = await Faculty.findByIdAndDelete(id).exec();
            if (!faculty) {
                req.session.message = {
                    type: 'error',
                    message: 'A Faculty not found',
                };
                return res.redirect('back'); // Redirect back to the previous page
            }
            
            req.session.message = {
                type: 'success',
                message: 'Faculty deleted Successfully!',
            };
            res.redirect('back');
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },

    editFaculty: async(req, res) => {
        try{
            const facultyId = req.params.id;
            const adminId = req.adminId;
            const admin = await Admin.findById(adminId).exec();
            const faculties = await Faculty.find();

            const faculty = await Faculty.findById(facultyId).exec();


            res.render('administration/editFacultySite', {title: 'Edit Faculty', faculty: faculty, admin: admin, faculties: faculties})
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    updatedFaculty: async(req,res)=>{
        try{
            const id = req.params.id;
            const newName = req.body.name;
            const faculty = await Faculty.findById(id);
        
            if (!faculty) {
                return res.status(404).json({ message: 'Faculty not found' });
            }

        // Update the name
            faculty.name = newName;

        // Save the updated faculty
            await faculty.save();
            req.session.message = {
                type: 'success',
                message: 'Updated Successfully'
            }
            res.redirect('/listFaculty');
        }catch(err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },

    deleteTerms: async (req, res) => {
        const id = req.params.id;
        try {
            const term = await Terms.findByIdAndDelete(id).exec();
            if (!term) {
                req.session.message = {
                    type: 'error',
                    message: 'Terms not found',
                };
                return res.redirect('back'); 
            }
            
            req.session.message = {
                type: 'info',
                message: 'Term deleted Successfully!',
            };
            res.redirect('back');
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },

    deleteAcademy: async (req, res) => {
        try {
            const id = req.params.id;
            const academy = await Academy.findByIdAndDelete(id).exec();

            if (!academy) {
                req.session.message = {
                    type: 'error',
                    message: 'Academy not found',
                };
                return res.redirect('back'); 
            }
            req.session.message = {
                type: 'info',
                message: 'Academy deleted Successfully!',
            };
            res.redirect('back');
        } catch (err) {
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },

    editAcademySite: async(req, res) => {
        try {
            const adminId = req.adminId;
            const admin = await Admin.findById(adminId).exec();
            const academyId = req.params.id;
            const academy = await Academy.findById(academyId).exec();

            if(!admin) {
                res.status(400).json({ message: "Not Found Administrator" });
            }
            if(!academy) { 
                res.status(400).json({ message: "Not Found Academy" });
            }
            res.render('administration/editAcademySite', {title: "Edit Academy", academy: academy, admin: admin});
        } catch(err) {
            res.status(400).json({ message: err.message });
        }
    },

    editAcademy: async (req, res) => {
        try {
            const academyId  = req.params.id; 
            const { name, description, startDate, endDate } = req.body;
    
            const existingAcademy = await Academy.findById(academyId);
            console.log(existingAcademy);
            if (!existingAcademy) {
                return res.status(404).json({ message: 'Academy not found' });
            }
            existingAcademy.name = name;
            existingAcademy.description = description;
            existingAcademy.startDate = startDate;
            existingAcademy.endDate = endDate;
    
            const updatedAcademy = await existingAcademy.save();

            req.session.message = {
                type: "success",
                message: "Edit Academy Successfully",
            }
            res.redirect(`/editAcademy/${academyId}`);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },
    
    
};

module.exports = adminController;