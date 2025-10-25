import type { RequestHandler, Request, Response, NextFunction } from "express";
import { createLogger, format, transports } from "winston";
import morgan from "morgan";
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
// Simple helpers to colorize parts of the log for development console output.
const ANSI_RESET = "\x1b[0m";
const ANSI_RED = "\x1b[31m";
const ANSI_YELLOW = "\x1b[33m";
const ANSI_GREEN = "\x1b[32m";
const ANSI_CYAN = "\x1b[36m";

function colorizeStatus(status: number | undefined): string {
    if (status === undefined) return "-";
    if (status >= 500) return `${ANSI_RED}${status}${ANSI_RESET}`;
    if (status >= 400) return `${ANSI_YELLOW}${status}${ANSI_RESET}`;
    if (status >= 300) return `${ANSI_CYAN}${status}${ANSI_RESET}`;
    return `${ANSI_GREEN}${status}${ANSI_RESET}`;
}

// In development we want pretty, colored logs similar to NestJS console output.
const devFormat = format.combine(
    format.colorize({ all: false }), // colorize level only
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf((info) => {
        const {
            timestamp,
            level,
            message,
            ip,
            method,
            url,
            status,
            durationMs,
        } = info as any;

        const statusColored = colorizeStatus(status);
        const time = timestamp || new Date().toISOString();

        // Build a compact, human-friendly log line
        let line = `${time} ${level} ${method ?? "-"} ${
            url ?? "-"
        } ${statusColored} ${durationMs ?? "-"}ms - ${message}`;

        // Append IP and any additional meta as JSON (not colorized)
        const meta: Record<string, unknown> = {};
        if (ip) meta.ip = ip;
        return `${line} ${
            Object.keys(meta).length ? JSON.stringify(meta) : ""
        }`.trim();
    })
);

const prodFormat = format.combine(format.timestamp(), format.json());

export const winstonLogger = createLogger({
    level: appConfig.logLevel,
    format: appConfig.nodeEnv === "production" ? prodFormat : devFormat,
    transports: [new transports.Console({ stderrLevels: ["error"] })],
});

// Morgan -> Winston adapter: reuse the same winstonLogger (no duplicate functions)
// This produces a compact JSON object per request and forwards it to Winston.
const morganJson: morgan.FormatFn = (tokens, req, res) =>
    JSON.stringify({
        timestamp: new Date().toISOString(),
        ip: tokens["remote-addr"]?.(req, res) || (req as any).ip,
        method: tokens.method?.(req, res) || req.method,
        url:
            tokens.url?.(req, res) ||
            (req as any).originalUrl ||
            (req as any).url,
        status: Number(
            tokens.status?.(req, res) || (res as any).statusCode || 0
        ),
        durationMs: Number(tokens["response-time"]?.(req, res) || 0),
        length: tokens["res"]?.(req, res, "content-length") || undefined,
        userAgent:
            tokens["user-agent"]?.(req, res) ||
            (req as any).headers?.["user-agent"],
    });

export const morganMiddleware = morgan(morganJson, {
    // write to Winston so all logs go through the same sink
    stream: {
        write: (msg: string) => {
            try {
                const obj = JSON.parse(msg);
                // re-use winstonLogger for access logs; message is compact and useful
                winstonLogger.info(
                    `${obj.method} ${obj.url} ${obj.status} - ${obj.durationMs} ms`,
                    obj
                );
            } catch (err) {
                // fallback to raw log
                winstonLogger.info(msg.trim());
            }
        },
    },
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
