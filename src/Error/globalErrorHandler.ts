import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";


interface CustomError extends Error {
    statusCode?: number;
    status?: string;
    code?: number;
    name: string;
    isOperational?: boolean;
    meta?: { target?: string } | any;
}

// prisma error handler 
const handlePrismaValidationError = ( err: CustomError) => {
    const message =  `Invalid input data: ${err.message}`;
    return new AppError(message, 400)
}

const handlePrismaUniqueConstraintError = ( err: CustomError) => {
    const target = err.meta?.target || 'field';
    const message  =  `Duplicate field value entered for ${target}, Please use another value!`;
    return new AppError(message, 400)
}

const handlePrismaForeignKeyError = (err: CustomError) => {
    const field = err.meta?.target || 'field';
    const message = `Foreign Key onstraint failed: The value provided for ${field} does not exist`;
    return new AppError(message, 400);
}

const handlePrismaNotFondError = (err: CustomError) => {
    const message = `Record not found with the provided identifier`;
    return new AppError(message, 400);
}

const handlePrismaKnownRequestError = (err: CustomError) => {
    switch (err.code) {
        case 2002 :
            return handlePrismaUniqueConstraintError(err);
        case 2003 : 
            return handlePrismaForeignKeyError(err);
        case 2025 : 
            return handlePrismaNotFondError(err);
        case 2014: 
            return handlePrismaValidationError(err);
        default:
            return new AppError(err.message || 'Database error', 500);
    }
}

// send error in development  
const sendErrorDev = (err: CustomError, res: Response) => {
    res.status(err.statusCode || 500).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    })
}

// send error in production 
const sendErrorProd = (err: CustomError, res: Response) => {
    if (err.isOperational) {
        res.status(err.statusCode || 500).json({
            status: err.status,
            message: err.message
        })
    } else {
        // log the error 
        console.error('ERROR', err);
        // send generic error 
        res.status(err.statusCode || 500).json({
            status: 'Error',
            message: 'Something Went Wrong'
        })
    }
}

//  global Error Handler Middleware
export const globalErrorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error'

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res)
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err};

        // prisma Error 
        if (err.name === 'PrismaClientValidationError') error = handlePrismaValidationError(err);
        if (err.name === 'PrismaClientKnownRequestError') error = handlePrismaKnownRequestError(err);
        sendErrorProd(error, res)
    }
}