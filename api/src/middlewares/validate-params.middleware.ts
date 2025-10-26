import { type Request, type Response, type NextFunction } from "express";
import type { ZodSchema } from "zod";

/**
 * Middleware to validate `req.params` using a Zod schema.
 * Returns 400 with Zod errors if validation fails.
 */
export const validateParams = (schema: ZodSchema<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            return res.status(400).json({
                message: "Invalid route parameters",
                errors: result.error.issues,
            });
        }

        // Overwrite req.params with the parsed/typed data
        // (Express params are strings by default; this keeps the parsed shape.)
        req.params = result.data as any;
        return next();
    };
};

export default validateParams;
