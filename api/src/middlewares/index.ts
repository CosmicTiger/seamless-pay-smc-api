import { errorHandler } from "./error-handler.middleware";
import loggerMiddleware from "./logger.middleware";
import { validateData } from "./validate-data.middleware";

const middlewareCollections = {
    loggerMiddleware,
    errorHandler,
    validateData,
} as const;

export default middlewareCollections;
