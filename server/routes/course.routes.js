import { Router } from 'express';
import {
    getAllCourses,
    getLecturesByCourseId,
    createCourse,
    updateCourse,
    deleteCourse,
    addLectureToCourseById,
    removeLectureFromCourse
} from '../controllers/course.controller.js';
import { isLoggedIn, authorizedRoles } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/multer.middleware.js';

const router = Router();


// , isLoggedIn, authorizeRoles("ADMIN", "USER") - middlewares

// OLD Code
// router.get("/", getAllCourses);
// router.post("/", isLoggedIn, authorizeRoles("ADMIN"), createCourse);
// router.delete(
//   "/",
//   isLoggedIn,
//   authorizeRoles("ADMIN"),
//   removeLectureFromCourse
// );
// router.get("/:id", isLoggedIn, getLecturesByCourseId);
// router.post(
//   "/:id",
//   isLoggedIn,
//   authorizeRoles("ADMIN"),
//   upload.single("lecture"),
//   addLectureToCourseById
// );
// router.delete("/:id", isLoggedIn, authorizeRoles("ADMIN"), deleteCourseById);

// Refactored code

// In general on a single route if wanted to manage multiple methods, we can do the following 
router
    .route('/')
    .get(getAllCourses)
    .post(
        isLoggedIn,
        authorizedRoles('ADMIN'),
        upload.single('thumbnail'),
        createCourse
    )
    
    
router
    .route('/lectures')
    .delete(  // it is used when we are using req.query instead of req.params 
        isLoggedIn,
        authorizedRoles('ADMIN'),
        removeLectureFromCourse
    );

// If we use query params then we can use below route
// Mean in course.controller.js in removeLectureById, we take the
// course and lecture id by the following: const { courseId, lectureId } = req.params
// This routing is cleaner and more RESTful.
// router
//     .route('/:courseId/lectures/:lectureId')
//     .delete(
//         isLoggedIn,
//         authorizedRoles('ADMIN'),
//         removeLectureFromCourse
//     );
    

router
    .route('/:courseId')
    .get(isLoggedIn, getLecturesByCourseId)
    .put(
        isLoggedIn,  // this is authentication
        authorizedRoles('ADMIN'), // then the authorization of user
        updateCourse
    )
    .delete(
        isLoggedIn,
        authorizedRoles('ADMIN'),
        deleteCourse
    )
    .post(
        isLoggedIn,
        authorizedRoles('ADMIN'),
        upload.single('lecture'),
        addLectureToCourseById
    );

export default router;