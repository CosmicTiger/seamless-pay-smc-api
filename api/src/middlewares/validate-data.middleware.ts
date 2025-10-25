import type { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

import { StatusCodes } from "http-status-codes";

/**
 * Middleware to validate request data using Zod schema in corresponding cloud functions expecting data
 *
 * @export
 * @param {z.ZodObject<any, any>} schema
 * @return {NextFunction | Response}
 */
export function validateData(schema: z.ZodObject<any, any>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const requestBodyParsed = schema.parse(req.body);
            req.body = requestBodyParsed;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errorMessages = error.issues.map((issue: any) => ({
                    message: `${issue.path.join(".")} is ${issue.message}`,
                }));
                res.status(StatusCodes.BAD_REQUEST).json({
                    error: "Invalid data",
                    details: errorMessages,
                });
            } else {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    error: "Internal Server Error",
                });
            }
        }
    };
}
