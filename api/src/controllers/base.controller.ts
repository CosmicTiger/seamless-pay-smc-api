import { Router } from "express";
import type { Controller } from "../interfaces";

/**
 * Abstract base controller implementing the Controller interface.
 * Subclasses should provide an implementation for `initializeRoutes`.
 */
export default abstract class BaseController implements Controller {
    public path: string = "/api/v1";
    public router: Router;

    /**
     * @param path - base path for the controller (e.g. '/auth')
     */
    constructor(path = "") {
        this.path = this.path + path;
        this.router = Router();
        // Call subclass implementation to register routes
        this.initializeRoutes();
    }

    /**
     * Subclasses must implement this to register their routes on `this.router`.
     * Keep it `protected` so subclasses can override it but it is not part of the public API.
     */
    protected abstract initializeRoutes(): void;
}
