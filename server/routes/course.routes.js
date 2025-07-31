import { Router } from 'express';
import { getAllCourses, getLecturesByCourseId } from '../controllers/course.controller.js';
import { isLoggedIn } from '../middlewares/auth.middleware.js';

const router = Router();

// In general on a single route if wanted to manage multiple methods, we can do the following 
router
    .route('/')
    .get(getAllCourses);

router
    .route('/:courseId')
    .get(isLoggedIn, getLecturesByCourseId);

export default router;