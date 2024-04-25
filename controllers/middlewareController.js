const jwt = require('jsonwebtoken');


const middlewareController = {
    // verify token
    verifyToken: (req, res, next) => {
        try {
            const token = req.cookies.accessToken;
            if (!token) {
                throw new Error("Token not found");
            }
            jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decodedToken) => {
                if (err) {
                    res.status(403).json("Token not valid");
                } else {
                    const isAdmin = decodedToken.isAdmin;
                    if (isAdmin) {
                        req.admin = decodedToken;
                        req.adminId = decodedToken.id;
                        next();
                    } else {
                        res.render('users/loginUserSite', { message: { type: 'danger', message: 'You must authenticate as an admin' }, title: 'Login Admin' });
                    }
                }
            });
        } catch (err) {
            res.render('users/loginUserSite', { message: { type: 'danger', message: 'You must authenticate' }, title: 'Login Admin' });
        }
    },
    

    verifyUser: (req, res, next) => {
        try {
            const token = req.cookies.accessToken;
            if (!token) {
                return res.status(403).json({ message: 'Token not found' });
            }
    
            jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decodedToken) => {
                if (err) {
                    return res.status(403).json({ message: 'Token not valid' });
                } else {
                    const userRole = decodedToken.role;
                    if (userRole === "student" || userRole === "manager" || userRole === "coordinator" || userRole === "guest") {
                        req.user = decodedToken;
                        req.userId = decodedToken.id;
                        next();
                    } else {
                        res.render('users/loginUserSite', { message: { type: 'danger', message: 'You are not Allowed' }, title: 'Log In' });
                    }
                }
            });
        } catch (err) {
            return res.render('users/loginUserSite', { message: { type: 'danger', message: 'You Must Authenticated' }, title: 'Log In' });
        }
    },
    

    checkLogOutAdmin: (req, res, next) => {
        try {
            const token = req.cookies.accessToken;
            if (token) {
                // Nếu tồn tại token, tức là người dùng đã đăng nhập, chuyển hướng họ đến trang chính đã đăng nhập hoặc trang dành cho người dùng đã đăng nhập
                return res.redirect('/dashboard'); // Thay đổi đường dẫn tùy thuộc vào trang chính đã đăng nhập của bạn
            } else {
                // Nếu không có token, cho phép người dùng truy cập vào trang đăng nhập
                next();
            }
        } catch (error) {
            // Xử lý lỗi nếu có
            console.error("Error in checkLogout middleware:", error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    checkLogOutUser: async (req, res, next) => {
        try {
            const token = req.cookies.accessToken;
            if (token) {
                
                req.session.message = {
                    type: 'info',
                    message: 'You are already logged in.'
                };
                return res.redirect('/homePage');
            } else {
                // Nếu không có token, cho phép người dùng truy cập vào trang đăng nhập
                next();
            }
        } catch (error) {
            // Xử lý lỗi nếu có
            
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    
    multerErrorHandler: (err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            res.status(400).send('File upload error: ' + err.message);
        } else {
            res.status(500).send('Internal server error');
        }
    },
    
}

module.exports = middlewareController;