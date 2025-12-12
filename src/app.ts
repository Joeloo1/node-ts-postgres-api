import express, { NextFunction, Request , Response}  from "express";
import morgan from "morgan";

import productRoutes from "./Routes/productRoutes"
import categoryRoutes from "./Routes/categoriesRoutes";
import userRoutes from "./Routes/userRoutes";
import addressRoutes from "./Routes/addressRoutes";
import reviewsRoutes from "./Routes/reviewsRoutes";
import AppError from "./utils/AppError";
import { globalErrorHandler } from "./Error/globalErrorHandler";

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }));

// Development logging
console.log(process.env.NODE_ENV)
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}
// product Routes
app.use('/api/v1/products', productRoutes);
// category Routes
app.use('/api/v1/categories', categoryRoutes);
// User Routes
app.use('/api/v1/users', userRoutes);
// Address Routes
app.use('/api/v1/addresses', addressRoutes);
// reviews Routes
app.use('/api/v1/reviews', reviewsRoutes);

// HANDLING  unhandled Routes 
app.use( (req: Request, res: Response, next: NextFunction)=> {
    next( new AppError(`Can't find ${req.originalUrl} on this server`, 404))
})

app.use(globalErrorHandler)

export default app
