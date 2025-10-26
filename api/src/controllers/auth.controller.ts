import { type Request, type Response, type NextFunction } from "express";
import BaseController from "./base.controller";
import { StatusCodes } from "http-status-codes";

// NOTE: Validation
import { validateData } from "../middlewares/validate-data.middleware";
import {
    challengeMessageSchema,
    verifySignatureSchema,
    userIdParamSchema,
    fillOutProfileSchema,
} from "../schemas/user.schema";
import { validateParams } from "../middlewares/validate-params.middleware";
import type { UserIdParam, FillOutProfileBody } from "../schemas/user.schema";
import type { z } from "zod";
import { AuthService } from "../services";
import type { User } from "../interfaces/user.interface";

type ChallengeMessage = z.infer<typeof challengeMessageSchema>;
type UserLogin = z.infer<typeof verifySignatureSchema>; // NOTE: This helps out to be interpreted as an interface in the actual endpoint.

export default class AuthController extends BaseController {
    private authService: AuthService;

    constructor() {
        super("/auth");
        this.authService = new AuthService();
        // Bind handlers so `this` refers to the controller instance when Express invokes them
        this.generateChallenge = this.generateChallenge.bind(this);
        this.loginOrPushToRegister = this.loginOrPushToRegister.bind(this);
        this.fillOutUserProfile = this.fillOutUserProfile.bind(this);
    }

    protected initializeRoutes() {
        this.router.post(
            `${this.path}/generate-challenge`,
            validateData(challengeMessageSchema), // NOTE: is a must to use `validateData()` in order to zod middleware takes place
            this.generateChallenge
        );

        this.router.post(
            `${this.path}/login-or-push-to-register`,
            validateData(verifySignatureSchema), // NOTE: is a must to use `validateData()` in order to zod middleware takes place
            this.loginOrPushToRegister
        );

        this.router.post(
            `${this.path}/fill-out-profile/:userId`,
            validateParams(userIdParamSchema),
            validateData(fillOutProfileSchema),
            this.fillOutUserProfile
        );
    }

    private async generateChallenge(
        req: Request<{}, any, ChallengeMessage>,
        res: Response,
        _next: NextFunction
    ) {
        // NOTE: At this point `req.body` has type `ChallengeMessage` and has been validated by Zod.
        const { walletAddress } = req.body;

        const challenge = await this.authService.generateChallengeMessage(
            walletAddress
        );

        return res.status(StatusCodes.OK).json({
            message: "Challenge message generated successfully",
            data: { challenge },
        });
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
    private async loginOrPushToRegister(
        req: Request<{}, any, UserLogin>,
        res: Response,
        _next: NextFunction
    ) {
        // NOTE: At this point `req.body` has type `UserLogin` and has been validated by Zod.
        const { signature, message } = req.body;

        const { isVerified, recoveredAddress } =
            await this.authService.verifySignature(signature, message);
        let recentlyCreatedUser: User | null = null;

        if (!isVerified) {
            recentlyCreatedUser = await this.authService.registerMinimalUser(
                recoveredAddress
            );

            return res.status(StatusCodes.CREATED).json({
                message: `User registered with ID: ${recentlyCreatedUser?.userId}`,
            });
        }

        const branchingResult = !isVerified && recentlyCreatedUser === null;

        const responseMessage = branchingResult
            ? `User registered with Wallet Address: ${
                  (recentlyCreatedUser as unknown as User)?.walletAddress
              }`
            : `Login successful for ${recoveredAddress}`;

        return res
            .status(branchingResult ? StatusCodes.CREATED : StatusCodes.OK)
            .json({
                message: responseMessage,
                data: { user: recentlyCreatedUser },
            });
    }

    private async fillOutUserProfile(
        req: Request<UserIdParam, any, FillOutProfileBody>,
        res: Response,
        next: NextFunction
    ) {
        try {
            const { userId } = req.params;
            const payload = req.body;

            // Ensure user exists first
            const existingUser = await this.authService.getUserById(userId);
            if (!existingUser) {
                return res
                    .status(StatusCodes.NOT_FOUND)
                    .json({ message: "User not found" });
            }

            const updates = {
                ...existingUser,
                ...payload,
            } as unknown as User;

            const updatedUser = await this.authService.updateUserById(
                userId,
                updates
            );

            return res.status(StatusCodes.CREATED).json({
                message: "Registration successful",
                data: { user: updatedUser },
            });
        } catch (err) {
            return next(err);
        }
    }
}
