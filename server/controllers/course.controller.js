import Course from "../models/course.model.js"
import AppError from "../utils/appError.js"

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