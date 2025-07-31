import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import userRoutes from './routes/user.routes.js';
import courseRoutes from './routes/course.routes.js';
import errorMiddleware from './middlewares/error.middleware.js';
import morgan from 'morgan';

const app = express();

// parsing the incoming request body from json into js object
app.use(express.json());

// enable cookie-parser 
app.use(cookieParser());

// access api running on different application/port /domain 
app.use(cors({
    origin: [process.env.FRONTEND_URL],
    credentials: true
})); 

// logs the requests and gives the detailed info in terminal, we use 'morgon' library 
app.use(morgan('dev'));

// dummy route to test endpoint of an api
app.get('/ping', (req, res) => {
    res.send('Pong');
});



app.use('/api/v1/users', userRoutes);
app.use('/api/v1/courses', courseRoutes);

// if in case it doesn't meet to any other 3 route config, then it gets executed
// Default catch all route - 404
// app.use((req, res, next) => {
//     res.status(404).send(`OOPS!! 404 page not found`);
// });

// Default catch all route - 404 
app.all('*', (_req, res) => {
    res.status(404).send('OOPS!!! 404 Page Not Found');
});

// generic middleware 
app.use(errorMiddleware);

export default app;
