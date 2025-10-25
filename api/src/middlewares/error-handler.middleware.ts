import type { Request, Response, NextFunction } from "express";
import { winstonLogger } from "./logger.middleware";

export interface AppError extends Error {
    status?: number;
}

export const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    winstonLogger.error(err);

    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error",
    });
};
