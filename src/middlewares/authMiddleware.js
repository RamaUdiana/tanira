exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/');
};

exports.isRole = (roles) => {
    return (req, res, next) => {
        // 1. Pastikan user login
        if (!req.session.userId) {
            return res.redirect('/');
        }
        
        // 2. Cek Role
        if (!roles.includes(req.session.role)) {
            // JANGAN gunakan res.send(), tapi render view 403
            return res.status(403).render('403');
        }
        
        next();
    };
};