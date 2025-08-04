import { fstatSync } from "fs";
import Course from "../models/course.model.js";
import AppError from "../utils/appError.js";
import cloudinary from "cloudinary";
import fs from 'fs/promises';
import path from 'path';

/**
 * @ALL_COURSES
 * @ROUTE @GET {{URL}}/api/v1/courses
 * @ACCESS Public
 */

export const getAllCourses = async (req, res, next) => {
    try {
        const courses = await Course.find({}).select('-lectures'); // since lecture details are huge, so we don't need them to be displayed on frontend.
        res.status(200).json({
            success: true,
            message: 'All courses',
            courses,
        })
    } catch (e) {
        return next(
            new AppError(e.message, 500)
        )
    }
}

/**
 * @GET_LECTURES_BY_COURSE_ID
 * @ROUTE @POST {{URL}}/api/v1/courses/:id
 * @ACCESS Private(ADMIN, subscribed users only)
 */

export const getLecturesByCourseId = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId);

        // if we don't find any course
        if (!course) {
            return next(
                new AppError('Invalid course Id', 400)
            )
        }

        // if found 
        res.status(200).json({
            success: true,
            message: 'Course lectures fecthed successfully!',
            lectures: course.lectures
        })
    } catch (e) {
        return next(
            new AppError(e.messasge, 500)
        )
    }
}


/**
 * @CREATE_COURSE
 * @ROUTE @POST {{URL}}/api/v1/courses
 * @ACCESS Private (admin only)
 */

export const createCourse = async (req, res, next) => {
    try {
        const { title, description, category, createdBy } = req.body;

        if (!title || !description || !category || !createdBy)
        {
            return next(
                new AppError('All fields are required', 400)
            )
        }

        const course = await Course.create({
            title,
            description,
            category,
            createdBy,
            thumbnail: {
                public_id: 'DUMMY',
                secure_url: 'DUMMY'
            },
        });

        if (req.file) {
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'lms',
            });
            
            if (result) {
                course.thumbnail.public_id = result.public_id;
                course.thumbnail.secure_url = result.secure_url;
            }

            fs.rm(`uploads/${req.file.filename}`);
        }

        await course.save();

        res.status(200).json({
            success: true,
            message: 'Course created successfully!',
            course
        })


    } catch (e) {
        return next(
            new AppError(e.message, 500)
        )
    }
};

/**
 * @UPDATE_COURSE_BY_ID
 * @ROUTE @PUT {{URL}}/api/v1/courses/:id
 * @ACCESS Private (Admin only)
 */

export const updateCourse = async (req, res, next) => {
    try {
        const { courseId } = req.params;

        const course = await Course.findByIdAndUpdate(
            courseId,
            {
                // whatever the info is passed, that is only get updated 
                $set: req.body
            },
            {
                // it makes sure that all the validators that we kept while creating schema in course.model.js are satisfied
                runValidators: true
            }
        );

        if (!course) {
            return next(
                new AppError('Course does not exists', 400)
            );
        }

        res.status(200).json({
            success: true,
            message: 'Course updated successfully!',
            course
        });

    } catch (e) {
        return next(
            new AppError(e.message, 500)
        );
    }
};

/**
 * @DELETE_COURSE_BY_ID
 * @ROUTE @DELETE {{URL}}/api/v1/courses/:id
 * @ACCESS Private (Admin only)
 */

export const deleteCourse = async (req, res, next) => {
    try {
        const { courseId } = req.params;

        const course = await Course.findById(courseId);

        if (!course) {
            return next(
                new AppError('Course does not exit with given id', 500)
            )
        }

        // deleting the course 
        await Course.findByIdAndDelete(courseId);

        res.status(200).json({
            success: true,
            message: 'Course deleted successfully!'
        })
    } catch (e) {
        return next(
            new AppError(e.message, 500)
        )
    }
};

/**
 * @ADD_LECTURE
 * @ROUTE @POST {{URL}}/api/v1/courses/:id
 * @ACCESS Private (Admin Only)
 */

export const addLectureToCourseById = async (req, res, next) => {
    try {
        const { title, description } = req.body;
        const { courseId } = req.params;

        if (!title || !description) {
            return next(
                new AppError('Title and Description both are required', 400)
            )
        }

        // checking wheather course exits in DB or not
        const course = await Course.findById(courseId);

        // if course doesn't exits then
        if (!course) {
            return next(
                new AppError('Course with given Id does not exists!', 400)
            )
        }

        // if course exits, lets create an array which stores the lecture details
        const lectureData = {
            title,
            description,
            lecture: {}
        }

        
       // Run only if user sends a file
       if (req.file) {
        try {
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'lms', // Save files in a folder named lms
                chunk_size: 50000000, // 50 mb size
                resource_type: 'video',
            });

            // If success
            if (result) {
                // Set the public_id and secure_url in array
                lectureData.lecture.public_id = result.public_id;
                lectureData.lecture.secure_url = result.secure_url;
            }

            // After successful upload remove the file from local storage
            await fs.rm(`uploads/${req.file.filename}`);
            } catch (error) {
                // Empty the uploads directory without deleting the uploads directory
                for (const file of await fs.readdir('uploads/')) {
                await fs.unlink(path.join('uploads/', file));
            }

            // Send the error message
            return next(
                new AppError(
                    JSON.stringify(error) || 'File not uploaded, please try again',
                        400
                    )
                );
            }
        }

        course.lectures.push(lectureData); // pushing the lecture data into lectures array
        course.numberOfLectures = course.lectures.length; // updating the no. of lectures

        console.log(course.numberOfLectures);

        await course.save();

        // if everything goes well, then sending back the response
        res.status(200).json({
            success: true,
            message: 'Lecture added to course successfully!',
            course
        })

    } catch (e) {
        return next(
            new AppError(e.message, 500)
        )
    }
};

/**
 * @Remove_LECTURE
 * @ROUTE @DELETE {{URL}}/api/v1/courses/:courseId/lectures/:lectureId
 * @ACCESS Private (Admin only)
 */

export const removeLectureFromCourse = async (req, res, next) => {
    // Grabbing the courseId and lectureId from req.query
    // const { courseId, lectureId } = req.params;  
    // above grabing is used when 
    // router.delete('/courses/:courseId/lectures/:lectureId', isLoggedIn, removeLectureFromCourse);

    const { courseId, lectureId } = req.query; 
    // the above grabing is used when the routing is defined as below
    // DELETE http://localhost:5000/api/v1/courses/lectures?courseId=YOUR_COURSE_ID&lectureId=YOUR_LECTURE_ID


    console.log(courseId);

    // Checking if both courseId and lectureId are present
    if (!courseId) {
        return next(new AppError('Course ID is required', 400));
    }

    if (!lectureId) {
        return next(new AppError('Lecture ID is required', 400));
    }

    // Find the course using the courseId
    const course = await Course.findById(courseId);

    // If no course available then send custom message
    if (!course) {
        return next(
            new AppError('Invalid ID or Course does not exit.', 400)
        )
    }

    // Find the index of the lecture using the lectureId
    const lectureIndex = course.lectures.findIndex(
        (lecture) => lecture._id.toString() === lectureId.toString()
    );

    // If returned index is -1 then send error
    if (lectureIndex === -1) {
        return next(new AppError('Lecture does not exit.', 404));
    }

    // Delete the lecture from cloudinary
    await cloudinary.v2.uploader.destroy(
        course.lectures[lectureIndex].lecture.public_id,
        {
            resource_type: 'video',
        }
    );

    // remove the lecture from the array
    course.lectures.splice(lectureIndex, 1);

    // update the number of lectures based on lectures array length
    course.numberOfLectures = course.lectures.length;

    // save the course object 
    await course.save();

    //  return response
    res.status(200).json({
        success: true,
        message: 'Course lecture removed successfully'
    });
};