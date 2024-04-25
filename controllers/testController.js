
const Admin = require('../models/admin');
const { User, roles } = require('../models/user');
const multer = require('multer');
const FileModel = require('../models/file');
const fs = require('fs');
const path = require("path");
const Terms = require('../models/terms');
const nodemailer = require('nodemailer');

const Academy = require('../models/academy');
const Blog = require('../models/blog');
const Faculty = require('../models/faculty');
const Comment = require('../models/comment');
const archiver = require('archiver');
const mammoth = require("mammoth");
const imageExtensions = require('image-extensions');    
const { measureMemory } = require('vm');
const academy = require('../models/academy');


const storageArticle = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads_Article/");
    },
    filename: function (req, file, cb) {
        // Define allowed file extensions
        const allowedExtensions = [ '.jpg', '.docx'];
        // Check if the file extension is in the allowed list
        const fileExt = '.' + file.originalname.split('.').pop().toLowerCase();
        if (allowedExtensions.includes(fileExt)) {
            // Generate a unique filename using the fieldname, current timestamp, and original filename
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            // Get the original filename without extension
            const originalFileName = file.originalname.split('.').slice(0, -1).join('.');
            // Generate the filename with original name and unique suffix
            const finalFileName = originalFileName + '_' + uniqueSuffix + fileExt;
            cb(null, finalFileName);
        } else {
            // If the file extension is not allowed, return an error
            cb(new Error('File type not allowed'));
        }
    }
});

const uploadFields = multer({
    storage: storageArticle,
}).fields([
    { name: 'image', maxCount: 1 },
    { name: 'files', maxCount: 10 }
]);

const testController = {

    academySite: async (req, res) => {
        const admin = await Admin.findOne();
        const academy = await Academy.find()
        res.render('administration/academy', { title: "Academy", admin: admin, academy: academy });
    },
    newAcademy: async (req, res) => {
        const admin = await Admin.findOne();
        res.render('administration/addAcademy', { title: "Add New Academy", admin: admin });
    },
    addAcademy: async (req, res) => {
        try {
            const { name, description, startDate, endDate } = req.body;

            const newAcademy = new Academy({
                name,
                description,
                startDate,
                endDate
            });

            const savedAcademy = await newAcademy.save();

            req.session.message = {
                type: "success",
                message: "Add Academy Successfully",
            }

            res.redirect("/addAcademy");
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    addBlog: async (req, res) => {
        uploadFields(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ message: err.message, type: "danger" });
            }
            try {
                const id = req.params.id;
                const academy = await Academy.findById(id);
                const userId = req.userId;
                const user = await User.findById(userId).populate('faculty').exec();
                const userEmail = user.email;
                const { titles, content } = req.body;
                const image = req.files['image'] ? req.files['image'][0].filename : null;
                const imageFile = req.files['image'] ? req.files['image'][0] : null;
                if (imageFile) {
                    const fileExtension = imageFile.originalname.split('.').pop().toLowerCase();
                    if (!imageExtensions.includes(fileExtension)) {
                        req.session.message = {
                            type: 'danger',
                            message: 'Uploaded file is not an image. Please upload an image file.'
                        }
                        return res.redirect(`/addBlog/${id}`);
                    }
                } 
                const wordFile = req.files['files'] ? req.files['files'][0] : null;
                if (wordFile) {
                    const fileExtension = wordFile.originalname.split('.').pop().toLowerCase();
                    if (fileExtension !== 'docx') {
                        req.session.message = {
                            type: 'danger',
                            message: 'Uploaded file is not a Word document (.docx). Please upload a .docx file.'
                        }
                        return res.redirect(`/addBlog/${id}`);
                    }
                }
                const facultyId = user.faculty._id;
                const fileSavingTasks = [];
                const agreedToTerms = req.body.agreeToTerms;

                if (!agreedToTerms) {
                    req.session.message = {
                        type: 'danger',
                        message: 'You must agree to the terms and conditions'
                    };
                    req.session.formData = { titles, content };
                    if (image) {
                        req.session.formData.image = image; 
                    }
                    if (wordFile) {
                        req.session.formData.wordFile = wordFile.filename; 
                    }
                    if (req.session.formData) {
                        let selectedFiles = [];
                        if (req.session.selectedFiles) {
                            selectedFiles = req.session.selectedFiles;
                        }
                        return res.render('users/newBlogForm', { title: "Add Again", user, formData: req.session.formData, selectedFiles, message: req.session.message, academy });
                    }
                }
                const files = req.files['files'] || [];

                const newBlog = new Blog({
                    title: titles,
                    backgroundImage: image,
                    status: 'pending', 
                    content: content,
                    faculty: facultyId,
                    user: userId,
                    academy: id,
                });

                const savedBlog = await newBlog.save();

                if (!files || files.lenght === 0) {
                    return res.status(400).json({ message: 'No files uploaded' });
                }
                files.forEach((file) => {
                    const fileData = fs.readFileSync(file.path);
                    const newFile = new FileModel({
                        filename: file.filename,
                        contentType: file.mimetype,
                        data: fileData,
                        blog: savedBlog._id,
                    });
                    fileSavingTasks.push(newFile.save());
                });

                // Find coordinator of the faculty
                const coordinator = await findCoordinatorOfFaculty(user.faculty._id);

                // Send email to the coordinator
                await sendEmailToCoordinator(coordinator.email, savedBlog, userEmail);

                req.session.message = {
                    type: "success",
                    message: "Add Blog Successfuly"
                };
                // Đợi cho tất cả các task lưu file hoàn thành
                await Promise.all(fileSavingTasks);

                
                res.redirect(`/addBlog/${id}`);
                
                
            } catch (error) {
                console.log(error);
                res.status(400).json({ message: error.message });
            }

            async function findCoordinatorOfFaculty(facultyId) {
                // Find the coordinator user based on the faculty ID
                const coordinator = await User.findOne({ faculty: facultyId, role: 'coordinator' });
                return coordinator;
            }

            async function sendEmailToCoordinator(email, blog, userEmail) {
                // Create transporter for Nodemailer
                const transporter = nodemailer.createTransport({
                    host: "smtp.gmail.com",
                    port: 587,
                    secure: false,
                    auth: {
                        user: "testEmailDemo2024@gmail.com",
                        pass: "cptx zzxz gkcm jpbb",
                    },
                });

                // Create email template
                const emailContent = `
                    <p>Dear Coordinator,</p>
                    <p>A new blog has been submitted in your faculty:</p>
                    <ul>
                        <li>Title: ${blog.title}</li>
                        <li>Create by: ${blog.user.username}</li>
                        <!-- Add more information about the blog if needed -->
                    </ul>
                    <p>Best regards,</p>
                    <p>Your Application</p>
                `;

                // Configure email
                const mailOptions = {
                    from: `${userEmail}`,
                    to: email,
                    subject: 'New Blog Submission',
                    html: emailContent
                };

                // Send email
                await transporter.sendMail(mailOptions);
            }
        });
    },

    approveBlog: async (req, res) => {
        try {
            const blogId = req.params.id;
            const status = req.query.status;

            // Tìm blog dựa trên ID
            const blog = await Blog.findById(blogId);
            const academyId = blog.academy._id;

            if (!blog) {
                return res.status(404).json({ message: 'Blog not found' });
            }

            // Nếu status là "publish" hoặc "rejected", không cho phép student thay đổi
            if (!blog.status) {
                return res.status(400).json({ message: 'Cannot change status' });
            }

            // Update status của blog
            blog.status = status;

            // Lưu lại vào database
            await blog.save();

            res.redirect(`/byStatus/${academyId}?status=pending`);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },
    blogByFaculty: async (req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId).populate('faculty').exec();
            const academy = await Academy.find();
            const faculty = await Faculty.find();
            const blogs = await Blog.find({ status: "publish", faculty: user.faculty._id }).populate('faculty academy user');
            const statuses = blogs.map(blog => blog.status);
            res.render('users/blogByFaculty', {
                title: "Blog By Faculty",
                user: user,
                academy: academy,
                selectedAcademy: null,
                faculty: faculty,
                blogs: blogs,
                statuses: statuses,
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    },
    blogList: async (req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId).populate('faculty');
            const academyId = req.params.id;
            const faculty = await Faculty.find();

            const blogs = await Blog.find({ academy: academyId, status: "publish", faculty: user.faculty._id }).populate('faculty academy user');
            const statuses = blogs.map(blog => blog.status);
            const academies = await Academy.findById(academyId).exec();
            const academy = await Academy.find();

            res.render('users/blogByFaculty', {
                title: "Blog List",
                blogs: blogs,
                selectedAcademy: academies,
                user: user,
                academy: academy,
                faculty: faculty,
                
                statuses: statuses,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    findByStatus: async (req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId).populate('faculty');
            const academyId = req.params.id;
            const status = req.query.status;

            if (!status) {
                throw new Error("Status parameter is missing");
            }

            const blogs = await Blog.find({ academy: academyId, status: status, faculty: user.faculty._id }).populate('faculty academy user');
            const academies = await Academy.findById(academyId).exec();
            const academy = await Academy.find();

            res.render('users/blogByFaculty', {
                title: "Blog List",
                blogs: blogs,
                selectedAcademy: academies,
                user: user,
                academy: academy,
                statuses: status,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    chooseStatus: async (req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId).populate('faculty');
            const status = req.query.status;

            if (!status) {
                throw new Error("Status parameter is missing");
            }

            const blogs = await Blog.find({status: status, faculty: user.faculty._id }).populate('faculty academy user');
            
            const academy = await Academy.find();

            res.render('users/blogByFaculty', {
                title: "Blog List",
                blogs: blogs,
                selectedAcademy: null,
                user: user,
                academy: academy,
                statuses: status,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    findByFaculty: async( req, res) => {
        try{
            const userId = req.userId;
            const user = await User.findById(userId).exec();
            
            const facultyId = req.params.id;
            const faculties = await Faculty.findById(facultyId);
            
            const faculty = await Faculty.find();
            const blogs = await Blog.find({faculty: facultyId, status: 'publish'}).populate('faculty academy user');
            const academy = await Academy.find();

            res.render('users/blogByFaculty', {
                title: "Blog List By Faculty", 
                blogs: blogs, 
                faculty, 
                user, 
                academy, 
                selectedAcademy: null,
                selectedFaculty: faculties,
            });
        } catch (err) {
            res.status(500).json({message: err.message});
        }
    },

    getAcademyInfo: async (req, res) => {
        try {
            const academyId = req.params.id;
            const academy = await Academy.findById(academyId);
            res.json(academy);
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Server error" });
        }
    },

    addBlogSite: async (req, res) => {
        try {
            const userId = req.userId;
            const id = req.params.id;
            const user = await User.findById(userId).populate('faculty');
            const academy = await Academy.findById(id).exec();
            const termsAndConditions = await Terms.findOne();

            if (!academy) {
                res.redirect('/blogByFaculty');
            }
            if (!termsAndConditions) {
                // Nếu không có điều khoản và điều kiện, trả về lỗi hoặc thông báo
                res.status(404).json("Terms and conditions not found!");
            }

            res.render('users/newBlogForm', { title: "Add New Blog", user: user, academy: academy, formData: null });
        } catch (err) {
            console.log(err);
            res.status(400).json({ message: err.message });
        }
    },

    blogDetails: async (req, res) => {
        try {
            const blogId = req.params.id;
            const userId = req.userId;
            const user = await User.findById(userId).exec();

            const blog = await Blog.findById(blogId).populate('faculty academy user').exec();
            const files = await FileModel.find({ blog: blogId }).populate('blog');
            const comments = await Comment.find({ blog: blogId }).populate('user');

            if (!blogId) {
                res.status(202).json("Cannot find any Blog!");
            }
            if (!userId) {
                res.status(202).json("User id not found");
            }
            if (!files && files.length === 0) {
                res.status(202).json("Not Found Files");
            }

            res.render('users/blog', {
                title: "Blog Details",
                blog: blog,
                user: user,
                files: files,
                comments: comments,
            });
        } catch (err) {
            res.status(500).json("Internal Server")
        }
    },
    addComment: async (req, res) => {
        try {
            const userId = req.userId;
            const blogId = req.params.id;
            const blog = await Blog.findById(blogId);
            const academyId = blog.academy._id;

            const academy = await Academy.findById(academyId);
            if (academy.status === 'Unactive') {
                // Nếu academy Unactive, kiểm tra thời gian
                const currentTime = new Date();
                const fourteenDaysAgo = new Date();
                fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

                // Nếu thời gian hiện tại cách thời gian Unactive của academy ít hơn hoặc bằng 14 ngày, cho phép comment
                if (academy.unactiveDate && currentTime <= fourteenDaysAgo) {
                    const comment = new Comment({
                        content: req.body.content,
                        user: userId,
                        blog: blogId,
                    });

                    await comment.save();
                    return res.redirect(`/blogDetails/${blogId}`);
                } else {
                    req.session.message ={ 
                        type: 'danger',
                        message: "You can not comment after 14 days."
                    }
                    return res.redirect(`/blogDetails/${blogId}`);
                }
            }

            const comment = new Comment({
                content: req.body.content,
                user: userId,
                blog: blogId,
            });

            await comment.save();


            res.redirect(`/blogDetails/${blogId}`);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    editBlogSite: async (req, res) => {
        try {
            const userId = req.userId;
            const blogId = req.params.id;
            const user = await User.findById(userId).populate('faculty');
            const blog = await Blog.findById(blogId).populate('faculty academy user');
            const files = await FileModel.find({ blog: blogId }).populate('blog');
            const termsAndConditions = await Terms.findOne();

            if (!blog) {
                res.status(404).json("Blog not found!");
            }
            if (!termsAndConditions) {
                // Nếu không có điều khoản và điều kiện, trả về lỗi hoặc thông báo
                res.status(404).json("Terms and conditions not found!");
            }
            if (!files) {
                res.status(404).json("File not found!");
            }

            res.render('users/blogEdit', { title: "Edit Blog", user: user, blog: blog, files: files });
        } catch (err) {
            console.log(err);
            res.status(400).json({ message: err.message });
        }
    },

    updateBlog: async (req, res) => {
        uploadFields(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ message: err.message, type: "danger" });
            }
            try {
                const blogId = req.params.id;
                const userId = req.userId;
                const user = await User.findById(userId).exec();
                const userEmail = user.email;

                const { title, content } = req.body;
                let image = req.body.old_image; 
                let old_files = req.body.old_files;

                if (req.files['image']) {
                    image = req.files['image'][0].filename;
                }
                
                if (req.files['files']) {
                    files = req.files['files'].map(file => file.filename); 
                }

                const agreedToTerms = req.body.agreeToTerms;

                if (!agreedToTerms) {
                    req.session.message = {
                        type: 'danger',
                        message: "You must agree to the terms and conditions"
                    }
                    res.redirect(`/editBlog/${blogId}`);
                }

                const savedBlog = await Blog.findByIdAndUpdate(blogId, {
                    title: title,
                    backgroundImage: image,
                    content: content,
                    status: 'pending'
                });

                const fileSavingTasks = [];

                if (req.files['files']) {
                    req.files['files'].forEach((file) => {
                        const fileData = fs.readFileSync(file.path);
                        const newFile = new FileModel({
                            filename: file.filename,
                            contentType: file.mimetype,
                            data: fileData,
                            blog: blogId, 
                        });
                        fileSavingTasks.push(newFile.save());
                    });
                }

                await Promise.all(fileSavingTasks);

                const coordinator = await findCoordinatorOfFaculty(user.faculty._id);

                await sendEmailToCoordinator(coordinator.email, savedBlog, userEmail);

                req.session.message = {
                    type: "success",
                    message: "Edit Successfully"
                }
                res.redirect(`/editBlog/${blogId}`);
            } catch (error) {
                res.status(400).json({ message: error.message });
            }

            async function findCoordinatorOfFaculty(facultyId) {
                const coordinator = await User.findOne({ faculty: facultyId, role: 'coordinator' });
                return coordinator;
            }

            async function sendEmailToCoordinator(email, blog, userEmail) {
                const transporter = nodemailer.createTransport({
                    host: "smtp.gmail.com",
                    port: 587,
                    secure: false,
                    auth: {
                        user: "testEmailDemo2024@gmail.com",
                        pass: "cptx zzxz gkcm jpbb",
                    },
                });
                const emailContent = `
                    <p>Dear Coordinator,</p>
                    <p>A new blog has been submitted in your faculty:</p>
                    <ul>
                        <li>Title: ${blog.title}</li>
                        <li>Create by: ${blog.user.username}</li>
                        <!-- Add more information about the blog if needed -->
                    </ul>
                    <p>Best regards,</p>
                    <p>Your Application</p>
                `;

                const mailOptions = {
                    from: `${userEmail}`,
                    to: email,
                    subject: 'Student Edit Blog Submission',
                    html: emailContent
                };

                await transporter.sendMail(mailOptions);
            }
        });
    },

    downloadFile: async (req, res) => {
        try {
            const fileId = req.params.id;
            const file = await FileModel.findById(fileId).exec();

            if (!file) {
                return res.status(404).json({ message: "File not found" });
            }
            const filePath = path.join(__dirname, '../uploads_Article', file.filename);
            const files = [filePath]; 
            const archive = archiver('zip', { zlib: { level: 9 } });
            archive.pipe(res);
            files.forEach(file => {
                archive.file(file, { name: path.basename(file) }); 
            });
            archive.finalize();
            res.attachment('downloaded_files.zip');
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    },

    deleteOneFile: async (req, res) => {
        const fileId = req.params.id; 
        try {
            const deletedFile = await FileModel.findByIdAndDelete(fileId);
            if (!deletedFile) {
                return res.status(404).json({ message: 'File not found' });
            }
            const blogId = deletedFile.blog; 

            req.session.message = {
                type: "success",
                message: "File deleted successfully"
            };

            res.redirect(`/editBlog/${blogId}`);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    usersBlog: async( req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId).populate('faculty').exec();
            const blog = await Blog.find({user: user}).populate('faculty academy user');
            const statuses = blog.map(blog => blog.status);

            const academy = await Academy.find();

            res.render('users/usersBlog', {title: "My Blog",
                statuses: statuses, 
                blogs: blog, user: user, selectedAcademy: null, academy: academy});
        } catch (err) {
            res.status(500).json({message: 'Blog not found'})
        }
    },
    selectAcademy: async (req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId).populate('faculty');
            const academyId = req.params.id;
            const faculty = await Faculty.find();

            const blogs = await Blog.find({ academy: academyId, status: "publish", faculty: user.faculty._id, user: user }).populate('faculty academy user');
            const statuses = blogs.map(blog => blog.status);

            const academies = await Academy.findById(academyId).exec();
            const academy = await Academy.find();

            res.render('users/usersBlog', {
                title: "Blog List",
                blogs: blogs,
                selectedAcademy: academies,
                user: user,
                academy: academy,
                faculty: faculty,
                statuses: statuses,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    filterStatus: async (req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId);
            const academyId = req.params.id;
            const status = req.query.status;

            if (!status) {
                throw new Error("Status parameter is missing");
            }


            const blogs = await Blog.find({ academy: academyId, status: status, user: user }).populate('faculty academy user');
            const academies = await Academy.findById(academyId).exec();
            const academy = await Academy.find();
            console.log(blogs);
            console.log(academies);
            res.render('users/usersBlog', {
                title: "Blog List",
                blogs: blogs,
                selectedAcademy: academies,
                user: user,
                academy: academy,
                statuses: status,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    statusWithFaculty: async (req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId).populate('faculty');
            const status = req.query.status;

            if (!status) {
                throw new Error("Status parameter is missing");
            }

            const blogs = await Blog.find({ status: status, user: user }).populate('faculty academy user');
            const academy = await Academy.find();

            res.render('users/usersBlog', {
                title: "Blog List",
                blogs: blogs,
                selectedAcademy: null,
                user: user,
                academy: academy,
                statuses: status,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    userProfiles: async(req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId).populate('faculty').exec();

            res.render('users/userDetails', {title: 'User Profile', user: user});
        } catch(error) {
            res.status(500).json({ message: error.message });
        }
    },

    viewFile: async(req, res) => {
        try {
            const fileId = req.params.id;
    
            const file = await FileModel.findById(fileId);
    
            if (!file) {
                return res.status(404).send('File not found!');
            }
    
            const filePath = path.join(__dirname, '../uploads_Article', file.filename);
    
            mammoth.convertToHtml({ path: filePath })
                .then(result => {
                    res.send(result.value);
                })
                .catch(err => {
                    console.error('Error converting file:', err);
                    res.status(500).send('Error converting file');
                });
        } catch(err) {
            res.status(500).json({ message: err.message });
        }
    },

    userEdit: async(req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId).populate('faculty').exec();

            res.render('users/userEditPage', {title: 'User Edit Profile', user: user});
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
};

module.exports = testController;