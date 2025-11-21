import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError, } from "zod"
import AppError from "../utils/AppError";


export const validate = (Schema: ZodObject<any>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
           await Schema.parseAsync(req.body);
        // if validation pass call next: (continue)
        next()
        }catch (error) {
            // handle Zod validation error 
            if (error instanceof ZodError) {
                const errorMessage = error.issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                }))
                return next(new AppError(JSON.stringify(errorMessage, null, 2), 400))
            }

            // pass other error to error handler 
            next(error)
        }
    }
}