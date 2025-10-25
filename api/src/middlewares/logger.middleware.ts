import type { RequestHandler, Request, Response, NextFunction } from "express";
import { createLogger, format, transports } from "winston";
import appConfig from "../core/config/app.config";

/**
 * Express logger middleware (TypeScript)
 * - Logs method, originalUrl, status, response time, ip
 * - Safely logs params, query and a truncated body to avoid huge payloads
 * - Uses `res.on('finish')` to capture final status code and timing
 */
const MAX_BODY_LOG_LENGTH = 1000; // chars

function safeStringify(obj: unknown, maxLen = MAX_BODY_LOG_LENGTH): string {
    try {
        const str = typeof obj === "string" ? obj : JSON.stringify(obj);
        if (str.length > maxLen) {
            return str.slice(0, maxLen) + "...[truncated]";
        }
        return str;
    } catch (err) {
        return String(err);
    }
}

// Create a lightweight Winston logger for local/structured logging fallback
export const winstonLogger = createLogger({
    level: appConfig.logLevel,
    format: format.combine(format.timestamp(), format.json()),
    transports: [new transports.Console()],
});

/**
 * Middleware to log incoming requests
 *
 * @export
 * @param {Request} request
 * @param {Response} response
 * @param {NextFunction} next
 */
export const loggerMiddleware: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const start = process.hrtime();

    // Attach finish listener so we log status and duration
    res.on("finish", () => {
        const [s, ns] = process.hrtime(start);
        const durationMs = (s * 1e3 + ns / 1e6).toFixed(3);

        const method = req.method;
        // originalUrl keeps the full path including mount path and query
        const url = req.originalUrl || req.url;
        const status = res.statusCode;
        const ip =
            req.ip ||
            req.headers["x-forwarded-for"] ||
            req.socket?.remoteAddress ||
            "unknown";

        // Avoid logging extremely large bodies — truncate safely
        const bodyLog = req.body ? safeStringify(req.body) : undefined;

        const meta = {
            ip,
            method,
            url,
            status,
            durationMs,
            params:
                req.params && Object.keys(req.params).length
                    ? req.params
                    : undefined,
            query:
                req.query && Object.keys(req.query).length
                    ? req.query
                    : undefined,
            body: bodyLog,
        };

        // Always use Winston for logging in this project
        winstonLogger.info(
            `${method} ${url} ${status} - ${durationMs} ms`,
            meta
        );
    });

    next();
};

export default loggerMiddleware;
