import { Request, Response, NextFunction } from "express";
import { ZodError, ZodSchema } from "zod"
import AppError from "../utils/AppError";

interface ValidationSchemas {
    body?: ZodSchema;
    params?: ZodSchema;
    query?: ZodSchema;
}

export const validate = (Schemas: ValidationSchemas) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
          // Validate body if schema provided
             // Validate body if schema provided
            if (Schemas.body) {
                req.body = await Schemas.body.parseAsync(req.body);
            }

            // Validate params if schema provided
            if (Schemas.params) {
                const validatedParams = await Schemas.params.parseAsync(req.params);
                req.params = validatedParams as any;
            }

            // Validate query if schema provided
            if (Schemas.query) {
                const validatedQuery = await Schemas.query.parseAsync(req.query);
                req.query = validatedQuery as any;
            }
        // if validation pass call next: (continue)
        next()
        }catch (error) {
            // handle Zod validation error 
            if (error instanceof ZodError) {
                return next(new AppError(error.issues[0].message, 400));
            }

            // pass other error to error handler 
            next(error)
        }
    }
}

// Helper function for body-only validation
export const validateBody = (schema: ZodSchema) => {
    return validate({ body: schema });
};

// Helper function for params-only validation
export const validateParams = (schema: ZodSchema) => {
    return validate({ params: schema });
};

// Helper function for query-only validation
export const validateQuery = (schema: ZodSchema) => {
    return validate({ query: schema });
};