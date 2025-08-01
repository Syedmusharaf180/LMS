import AppError from '../utils/appError.js';
import User from '../models/user.model.js';
import cloudinary from 'cloudinary';
import fs from 'fs/promises';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';

const cookieOptions = {
    secure: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true
}

/**
 * @REGISTER
 * @ROUTE @POST {{URL}}/api/v1/user/register
 * @ACCESS Public
 **/

const register = async (req, res, next) => {

    // Destructuring the necessary data from req object
    const { fullName, email, password } = req.body;

    // Check if the data is there or not, if not throw error message
    if (!fullName || !email || !password) {
        return next(new AppError('All fields are required', 400));
    }

    // Check if the user exists with the provided email
    const userExists = await User.findOne({ email });

    // If user exists send the reponse
    if (userExists) {
        return next(new AppError('Email already exists', 400));
    }

    // if user doesn't exist , create new user with the given necessary data and save to DB
    const user = await User.create({
        fullName,
        email,
        password,
        avatar: {
            public_id: email,
            secure_url: 'https://res.cloudinary.com/du9jzqlpt/image/upload/v1674647316/avatar_drzgxv.jpg',
        }
    });

    // if we are not able to create this user , send message response
    if (!user) {
        return next(new AppError('User registration failed, please try again', 400));
    }

    // Run only if user sends a file
    if (req.file) {
        try {
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'lms', // save files in a folder named lms
                width: 250,
                height: 250,
                gravity: 'faces', // This option tells cloudinary to center the around the detected faces (if any) after cropping or resizing the original image
                crop: 'fill'
            });

            // If success
            if (result) {
                // Set the public_id and secure_url (of cloudinary) in DB
                user.avatar.public_id = result.public_id;
                user.avatar.secure_url = result.secure_url;

                // After successful upload remove file local server/storage
                fs.rm(`uploads/${req.file.filename}`);
            }

        } catch (e) {
            return next(new AppError(e.message || 'File not uploaded, please try again', 400));
        }
    }
    
    await user.save(); // saving user object into DB

    // Generating a JWT token 
    const token = await user.generateJWTToken();

     // Setting the password to undefined so it does not get sent in the response
    user.password = undefined;

    // Setting the token in the cookie with name token along with cookieOptions
    res.cookie('token', token, cookieOptions);

     // If all good send the response to the frontend
    res.status(200).json({
        success: true,
        message: 'User registered successfully',
        user
    })
};

/**
 * @LOGIN
 * @ROUTE @POST {{URL}}/api/v1/user/login
 * @ACCESS Public
*/

const login = async (req, res, next) => {
    // Destructuring the necessary data from req object
    const { email, password } = req.body;

    // Check if the data is there or not, if not throw error message
    if (!email || !password) {
        return next(new AppError('Email and Password are required', 400));
    }

    // Finding the user with the sent email
    const user = await User.findOne({
        email
    }).select('+password')

    // If no user or sent password do not match then send generic response
    if (!(user && ( await user.comparePassword(password)))){ // TODO
        return next(new AppError('Email or password do not match or user does not exits', 400));
    }

    // if password matching is done and we found the user then
    // generat ing a JWT token 
    const token = await user.generateJWTToken();

    // Setting the password to undefined so it does not get sent in the response
    user.password = undefined;

    // Setting the token in the cookie with name token along with cookieOptions
    res.cookie('token', token, cookieOptions);

    // If all good send the response to the frontend
    res.status(201).json({
        success: true,
        message: 'User logged in Successfully!',
        user
    });

};

/**
 * @LOGOUT
 * @ROUTE @POST {{URL}}/api/v1/user/logout
 * @ACCESS Public
*/

const logout = async (req, res, next) => {
    console.log("Logout route hit");
    // Setting the cookie value to null
    res.cookie('token', null, {
        secure: true,
        maxAge: 0,
        httpOnly: true
    });

    // sending the response
    res.status(200).json({
        success: true,
        message: 'User logged out successfully'
    });
};

/**
 * @LOGGED_IN_USER_DETAILS
 * @ROUTE @GET {{URL}}/api/v1/user/me
 * @ACCESS Private(Logged in users only)
 */

const getProfile = async (req, res, next) => {
    // Finding the user using the id from modified req object
    const user = await User.findById(req.user.id);

    res.status(200).json({
        success: true,
        message: 'User details',
        user
    });
};

/**
 * @FORGOT_PASSWORD
 * @ROUTE @POST {{URL}}/api/v1/user/reset
 * @ACCESS Public
*/

const forgotPassword = async (req, res, next) => {
    // Extracting email from request body
    const { email } = req.body;

     // If no email send email required message
    if (!email) {
        return next(
            new AppError('Email is required', 400)
        )
    }

    // Finding the user via email
    const user = await User.findOne({ email });

    // If no email found send the message email not found
    if (!user) {
        return next(
            new AppError('Email is not registered', 400)
        )
    }

    // if email exists in DB
    // we need to do reset token and generate a new token 
    // Generating the reset token via the method we have in user model
    const resetToken = await user.generatePasswordToken()  // we are going to implement this method in user.model.js

    // saving this info in DB before triggering an email
    // Saving the forgotPassword* to DB
    await user.save();

    // constructing a url to send the correct data

   /**HERE
   * req.protocol will send if http or https
   * req.get('host') will get the hostname
   * the rest is the route that we will create to verify if token is correct or not
   */
    
    // const resetPasswordUrl = `${req.protocol}://${req.get("host")}/api/v1/user/reset/${resetToken}`;
    
    // our intent is to generate a URL and trigger a email
    const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // We here need to send an email to the user with the token
    const subject = 'Reset Password';
    const message = `You can reset your password by clicking <a href=${resetPasswordUrl} target="_blank">Reset your password</a>\nIf the above link does not work for some reason then copy paste this link in new tab ${resetPasswordUrl}.\n If you have not requested this, kindly ignore.`;

    console.log(resetPasswordUrl);

    try {

        await sendEmail(email, subject, message);

        // If email sent successfully send the success response
        res.status(200).json({
            success: true,
            message: `Reset password token has been sent to ${email} successfully!`
        });
    } catch (e) {
        // in case we are not able to generate email
        // If some error happened we need to clear the forgotPassword* fields in our DB
        user.forgotPasswordExpiry = undefined;
        user.forgotPasswordToken = undefined;
        await user.save();
        return next(new AppError(e.message, 500));
    }
}

const resetPassword = async (req, res, next) => {

    console.log('Reset Password route hit!');
    // Extracting resetToken from req.params object
    const { resetToken } = req.params;

    // Extracting password from req.body object
    const { password } = req.body;

    // let's check wheather this token is valid or not and exists in DB
    // We are again hashing the resetToken using sha256 since we have stored our resetToken in DB using the same algorithm
    const forgotPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    // Checking if token matches in DB and if it is still valid(Not expired)
    const user = await User.findOne({
        forgotPasswordToken,
        forgotPasswordExpiry: { $gt: Date.now() }  // $gt will help us check for greater than value, with this we can check if token is valid or expired

    });

    // If not found or expired send the response
    if (!user) {
        return next(
            new AppError('Token is invalid or expired, please try again', 400)
        )
    }

    // Update the password if token is valid and not expired
    user.password = password;  // before it get saved in DB,this password is auto encrypted because of 'pre' hook we created in user.model.js

    // making forgotPassword* valus undefined in the DB
    user.forgotPasswordExpiry = undefined;
    user.forgotPasswordToken = undefined;

    // Saving the updated user values
    await user.save();

    // Sending the response when everything goes good
    res.status(200).json({
        success: true,
        message: 'Password changed successfully',
    });
}

const changePassword = async function (req, res, next) {
    // Destructuring the necessary data from the req object
    const { oldPassword, newPassword } = req.body;
    const { id } = req.user; // because of the middleware isLoggedIn

    // Check if the values are there or not
    if (!oldPassword || !newPassword) {
        return next(
            AppError('All fields are mandatory', 400)
        )
    }

    // Finding the user by ID and selecting the password
    const user = await User.findById(id).select('+password');

     // If no user then throw an error message
    if (!user) {
        return next(
            new AppError('User does not exist', 400)
        )
    }

    // Check if the old password is correct
    const isPasswordValid = await user.comparePassword(oldPassword); // in user.schema.js we have already created the comparePassword method to compare

    // If the old password is not valid then throw an error message
    if (!isPasswordValid) {
        return next(
            new AppError('Invalid old password', 400)
        )
    }

    // Setting the new password
    user.password = newPassword;

    // Save the data in DB
    await user.save();

     // Setting the password undefined so that it won't get sent in the response
    user.password = undefined;

    res.status(200).json({
        success: true,
        message: 'Password changed successfully!'
    })
};

const updateUser = async function (req, res, next) {
    // Destructuring the necessary data from the req object
    const { fullName } = req.body;
    const { id } = req.user; 
    
    const user = await User.findById(id);

    if (!user) {
        return next(
            new AppError('Invalid user id or user does not exits', 400)
        )
    }

    if (fullName) {
        user.fullName = fullName; // updating the fullname if provided in req.body
    }

    // Run only if user sends a file
    try {
        if (req.file) {
           // Deletes the old image uploaded by the use
           await cloudinary.v2.uploader.destroy(user.avatar.public_id);

           // now reuploading the given req.file into cloudinary after deleting the previous one
           const result = await cloudinary.v2.uploader.upload(req.file.path, {
               folder: 'lms', // Save files in a folder named lms
               width: 250,
               height: 250,
               gravity: 'faces', // This option tells cloudinary to center the image around detected faces (if any) after cropping or resizing the original image
               crop: 'fill'
           });

           // If success
            if (result) {
               // Set the public_id and secure_url in DB
               user.avatar.public_id = result.public_id;
               user.avatar.secure_url = result.secure_url;

               // remove file from local server after successfully uploadng to cloudinary
               fs.rm(`uploads/${req.file.filename}`);
           }
        }
        
    } catch (error) {
        return next(
            new AppError(error || 'File not uploaded , please try again', 400)
        );
    }

    // Save the user object in DB
    await user.save();


    res.status(200).json({
        success: true,
        message: 'User details updated successfully!'
    })
};

export {
    register,
    login,
    logout,
    getProfile,
    forgotPassword,
    resetPassword,
    changePassword,
    updateUser
}