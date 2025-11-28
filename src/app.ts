import express, { NextFunction, Request , Response}  from "express";
import morgan from "morgan";

import productRoutes from "./Routes/productRoutes"
import categoryRoutes from "./Routes/categoriesRoutes";
import AppError from "./utils/AppError";
import { globalErrorHandler } from "./Error/globalErrorHandler";

const app = express()
app.use(express.urlencoded({ extended: true }));

app.use(express.json())
app.use(morgan('dev'))

app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes)

// HANDLING  unhandled Routes 
app.use( (req: Request, res: Response, next: NextFunction)=> {
    next( new AppError(`Can't find ${req.originalUrl} on this server`, 404))
})

app.use(globalErrorHandler)

export default app