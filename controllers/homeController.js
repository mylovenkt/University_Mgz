const bcrypt=require('bcryptjs');
const Admin = require('../models/admin');
const {User, roles} = require('../models/user');
const jwt = require('jsonwebtoken');
const Blog = require('../models/blog');
const mongoose = require('mongoose');

let refreshTokens = [];

const getBlogCountsByFaculty = async (facultyId) => {
    try {
        const blogCounts = await Blog.aggregate([
            { $match: { faculty: facultyId } },
            { $group: { _id: { academy: "$academy", status: "$status" }, count: { $sum: 1 } } },
            {
                $lookup: {
                    from: "academies",
                    localField: "_id.academy",
                    foreignField: "_id",
                    as: "academy"
                }
            },
            { $unwind: "$academy" },
            { 
                $addFields: { 
                    academyId: "$academy._id",
                    academyName: "$academy.name" 
                } 
            }, 
            { 
                $group: { 
                    _id: { academyId: "$academyId", academyName: "$academyName" }, 
                    countsByStatus: { $push: { status: "$_id.status", count: "$count" } } 
                } 
            }
        ]);

        return blogCounts;
    } catch (error) {
        console.error("Error getting blog counts by faculty:", error);
        throw error;
    }
};
const getBlogByStudent = async (studentId) => {
    try {
        const blogCounts = await Blog.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(studentId) } },
            { $group: { _id: {status: "$status"}, count: { $sum: 1 } } }
            
        ]).catch(err => {
            console.error("Error in query:", err);
            throw err;
        });
        return blogCounts;
    } catch (err) {
        console.error("Error in getBlogByStudent:", err);
        throw err;
    }
};

const getAllBlogCounts = async () => {
    const blogCounts = await Blog.aggregate([
        { $group: { _id: "$faculty", count: { $sum: 1 } } },
        { $lookup: { from: 'faculties', localField: '_id', foreignField: '_id', as: 'faculty' } },
        { $unwind: "$faculty" }
    ]);
    return blogCounts;
};

const homeController = {
    homePage: async (req, res) => {
        const userId = req.userId;
        const user = await User.findById(userId);
        res.render('users/index', {title: "Home Page", user: user});
    },

    loginedHome: async (req, res) => {
        const userId = req.userId; 
        const user = await User.findById(userId);
        let blogCounts = [];
        let facultyId;
        let chartConfig;

       
        if (user.role === 'coordinator') {
            facultyId = user.faculty; 
            const student = await User.find({role: 'student', faculty: facultyId });
            blogCounts = await getBlogCountsByFaculty(facultyId);

            const labels = [];
            const dataPending = [];
            const dataPublished = [];
            const dataRejected = [];

            blogCounts.forEach(blog => {
                labels.push(blog._id.academyName); 
                blog.countsByStatus.forEach(status => {
                    if (status.status === "pending") {
                        dataPending.push(status.count); 
                    } else if (status.status === "publish") {
                        dataPublished.push(status.count); 
                    } else if (status.status === "rejected") {
                        dataRejected.push(status.count);
                    }
                });
            });
            
            chartConfig = {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'publish',
                            data: dataPublished,
                            backgroundColor:'rgba(75, 192, 192, 0.2)' ,
                            borderColor: 'rgba(75, 192, 192, 1)' ,
                            borderWidth: 1
                        },
                        {
                            label: 'pending',
                            data: dataPending,
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Rejected',
                            data: dataRejected,
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            borderColor: 'rgba(255, 99, 132, 1)',
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
            return res.render('users/homePage', {
                text: "Number of Contribution in each Academy of Faculty",
                title: "Home Page to Submit", user: user, chartConfig: chartConfig, blogs: null, student: student, stu: null });
        } else {
            
            blogCounts = await getAllBlogCounts();
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
        }

        if(user.role === 'student') {
            const blogs = await Blog.find({faculty: user.faculty._id, status: 'publish'}).populate('faculty user academy');

            return res.render('users/homePage', {title: "Student Home Page", user: user, blogs: blogs, chartConfig: chartConfig});
        }
        if(user.role === 'guest') {
            const selectedBlogIds = user.selectedBlogs;

            const blogs = await Blog.find({ _id: { $in: selectedBlogIds } }).populate('faculty academy user');

            return res.render('users/homePage', {title: "Guest Home Page", user: user, blogs: blogs, chartConfig: chartConfig});
        }
        
        res.render('users/homePage', {title: "Home Page to Submit", user: user, chartConfig: chartConfig, blogs: null, 
            student: null, text: "Number of Contribution of Faculty", stu: null});
    },

    updateChart: async (req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId);
            const facultyId = user.faculty; 

            const email  = req.body.email;
            const students = await User.findOne({ email: req.body.email, role: 'student', faculty: facultyId});
            let studentId;
            if (students) {
                studentId = students.id;
            } else {
                req.session.message ={
                    type: 'danger',
                    message: 'Not Found Student with Email',
                }
                return res.redirect('/homePage');
            }
            const stu = await User.findById(studentId);

            let blogCounts = [];
            let chartConfig;

            blogCounts = await getBlogByStudent(studentId);

            const labels = [];
            const dataPending = [];
            const dataPublished = [];
            const dataRejected = [];

            blogCounts.forEach(blog => {
        
                labels.push(blog._id); 
                if (blog._id.status === "pending") {
                    dataPending.push(blog.count); 
                } else if (blog._id.status === "publish") {
                    dataPublished.push(blog.count);
                } else if (blog._id.status === "rejected") {
                    dataRejected.push(blog.count);
                }
            });

            chartConfig = {
                type: 'bar',
                data: {
                    labels: ['Rejected', 'Pending', 'Published'],
                    datasets: [
                        {
                            label: 'status',
                            data: [dataRejected, dataPending, dataPublished], 
                            backgroundColor:  [
                                'rgba(255, 99, 132, 0.2)',
                                'rgba(54, 162, 235, 0.2)',
                                'rgba(75, 192, 192, 0.2)',
                            ], 
                            borderColor: [
                                'rgba(255, 99, 132, 1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(75, 192, 192, 1)'
                            ],
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
            return res.render('users/homePage', {title: "Home Page", user: user, chartConfig: chartConfig, blogs: null, text: "Number of Contribution of Student", stu: stu});
        } catch (err) {
            res.status(500).json({ message: err.message, type: "danger" });
        }
    },


    loginUser: (req, res) => {
        res.render('users/loginUserSite', {title: "Log In"});
    },

    generateAccessToken: (user) => {
        return jwt.sign({
            id: user._id,
            role: user.role,
            token: user,
            isAdmin: user.isAdmin,
        },
            process.env.JWT_ACCESS_TOKEN,
            {
                expiresIn: "30d"
            }
        );
    },
    
    generateRefreshToken: (user) => {
        return jwt.sign({
            id: user._id,
            role: user.role,
            token: user,
            isAdmin: user.isAdmin,
        },
            process.env.JWT_REFRESH_KEY,
            {
                expiresIn: "365d"
            }
        );
    },

    login: async(req, res) => {
        try {
            req.session.userLoggedIn = false;
            const user = await User.findOne({ email: req.body.email});
            const admin = await Admin.findOne({ email: req.body.email });

            if(!user && !admin) {
                return res.render('users/loginUserSite', { message: { type: 'danger', message: 'Invalid Email' }, title: 'Log In' });
            }

            let validPassword = false;
            let loggedInUser = null;

            if (user) {
                validPassword = await bcrypt.compare(req.body.password, user.password);
                loggedInUser = user;
            } else if (admin) {
                validPassword = await bcrypt.compare(req.body.password, admin.password);
                loggedInUser = admin;
            } 

            if(!validPassword){
                return res.render('users/loginUserSite', { message: { type: 'danger', message: 'Wrong Password' }, title: 'Log In' });
            } 
              

            if (loggedInUser) {
                const accessToken = homeController.generateAccessToken(loggedInUser);
                const refreshToken = homeController.generateRefreshToken(loggedInUser);
                res.cookie("refreshToken", refreshToken);
                res.cookie("accessToken", accessToken);
    
                if (user) {
                    res.redirect('/homePage');
                } else if (admin) {
                    res.redirect('/dashboard');
                } 
            }
        } catch(err) {
            res.status(500).json({ message: err.message, type: "danger" });
        }
    },
    logout: async (req, res) => {
        try {
            res.clearCookie("refreshToken");
            refreshTokens = refreshTokens.filter(token => token !== req.cookies.refreshToken);
            res.clearCookie("accessToken");
            res.redirect("/loginUser");
        } catch (err) {
            console.log(err);
            res.status(500).json({ message: err.message, type: "danger" });
        }
    },
    
}

module.exports = homeController