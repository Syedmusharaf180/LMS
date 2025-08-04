import jwt from "jsonwebtoken";
import AppError from '../utils/appError.js';

const isLoggedIn = function (req, res, next) {
    const { token } = req.cookies;

    if (!token) {
        return next(new AppError('Unauthenticated, please login', 401));
    }

    const tokenDetails = jwt.verify(token, process.env.JWT_SECRET);
    if (!tokenDetails) {
        return next(new AppError('Unauthenticated, please login', 401));
    }

    req.user = tokenDetails;

    next();
};

const authorizedRoles = (...roles) => (req, res, next) => {
    const currentRole = req.user.role; // since the jwt token store info about role, email, subscription and 'user' variable stores token details
    if (!roles.includes(currentRole)) {
        return next(
            new AppError('You do not have permission to access this route', 403)
        )
    }
    next();
}

export {
    isLoggedIn,
    authorizedRoles
}