import express from "express";
import cors from "cors";
import type { Controller } from "./interfaces";
import loggerMiddleware from "./middlewares/logger.middleware";
import { errorHandler } from "./middlewares/error-handler.middleware";
import { validateData } from "./middlewares/validate-data.middleware";

/**
 *
 *
 * @class App
 */
class App {
    public app: express.Application;
    private port: number;

    /**
     * Creates an instance of App.
     * @param {Controller[]} controllers
     * @memberof App
     */
    constructor(controllers: Controller[], port: number = 5000) {
        this.app = express();
        this.port = port;

        this.initializeMiddlewares();
        this.initializeControllers(controllers);
    }

    /**
     * @description Starts the server
     *
     * @return {*}
     * @memberof App
     */
    public getServer() {
        return this.app;
    }

    /**
     * @description Starts the middlewares used in the Cloud Function App
     *
     * @private
     * @memberof App
     */
    private initializeMiddlewares() {
        this.app.use(loggerMiddleware);
        this.app.use(errorHandler);
        this.app.use(validateData);
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    /**
     *
     *
     * @private
     * @param {Controller[]} controllers
     * @memberof App
     */
    private initializeControllers(controllers: Controller[]) {
        controllers.forEach((controller) => {
            this.app.use("/", controller.router);
        });

        // Health endpoint: lightweight readiness/health check
        // Returns basic status, uptime (seconds) and server timestamp.
        this.app.get("/health", (_req, res) => {
            res.status(200).json({
                status: "ok",
                uptime: process.uptime(),
                timestamp: Date.now(),
            });
        });
    }

    public listen() {
        this.app.listen(this.port, () => {
            console.log(`Server is running on port ${this.port}`);
        });
    }
}

export default App;
