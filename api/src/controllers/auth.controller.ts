import { type Request, type Response, type NextFunction } from "express";
import BaseController from "./base.controller";
import { StatusCodes } from "http-status-codes";

// NOTE: Validation
import { validateData } from "../middlewares/validate-data.middleware";
import { userLoginSchema } from "../schemas/user.schema";
import type { z } from "zod";

type UserLogin = z.infer<typeof userLoginSchema>; // NOTE: This helps out to be interpreted as an interface in the actual endpoint.

class AuthController extends BaseController {
    constructor() {
        super("/auth");
    }

    protected initializeRoutes() {
        this.router.post(
            `${this.path}/login`,
            validateData(userLoginSchema), // NOTE: is a must to use `validateData()` in order to zod middleware takes place
            this.login
        );

        this.router.post(`${this.path}/register`, this.register);
    }

    /**
     *
     *
     * @private
     * @param {Request<{}, any, UserLogin>} req - The request body is validated and parsed according the zod 'UserLogin' schema
     * @param {Response} res
     * @param {NextFunction} next
     * @return {*}
     * @memberof AuthController
     */
    private login(
        req: Request<{}, any, UserLogin>,
        res: Response,
        next: NextFunction
    ) {
        // NOTE: At this point `req.body` has type `UserLogin` and has been validated by Zod.
        const { email } = req.body;

        // TODO: pending to implement actual auth logic (lookup user, check password, issue token...)
        return res
            .status(StatusCodes.OK)
            .json({ message: `Login successful for ${email}` });
    }

    private register(req: Request, res: Response, next: NextFunction) {
        // Registration logic
        return res
            .status(StatusCodes.CREATED)
            .json({ message: "Registration successful" });
    }
}

export default AuthController;
