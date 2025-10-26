import { ethers } from "ethers";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { SiweMessage } from "siwe";
import type { User } from "../interfaces/user.interface";
import hardhatAppConfig from "../core/config/hardhat-app.config";

export default class AuthService {
    constructor() {}

    private generateUserId(): string {
        return `USR-${crypto.randomUUID()}`;
    }

    public async generateChallengeMessage(
        walletAddress: string
    ): Promise<string> {
        try {
            const message = `Sign this message to prove you own the wallet: ${walletAddress}`;
            const domain = "myapp.com";
            const uri = "https://myapp.com";
            const nonce = crypto.randomBytes(16).toString("hex");

            const siweMessage = new SiweMessage({
                domain,
                address: walletAddress,
                statement: message,
                uri,
                version: "1",
                chainId: hardhatAppConfig.id,
                nonce,
                issuedAt: new Date().toISOString(),
            });

            return siweMessage.prepareMessage();
        } catch (error) {
            console.error("Error generating challenge message:", error);
            throw new Error("Failed to generate challenge message");
        }
    }

    public async verifySignature(
        signature: string,
        message: string
    ): Promise<{
        isVerified: boolean;
        recoveredAddress: string;
    }> {
        const signatureVerification = {
            isVerified: false,
            recoveredAddress: "",
        };

        try {
            let isVerified = false;
            const recoveredAddress = await ethers.verifyMessage(
                message,
                signature
            );
            const result = await db
                .select()
                .from(users)
                .where(eq(users.walletAddress, recoveredAddress));

            isVerified = result.length === 0 ? false : true;

            signatureVerification.isVerified = isVerified;
            signatureVerification.recoveredAddress = recoveredAddress;

            return signatureVerification;
        } catch (error) {
            console.error("Error verifying signature:", error);
            return signatureVerification;
        }
    }

    public async getUserById(userId: string): Promise<User | null> {
        const result = await db
            .select()
            .from(users)
            .where(eq(users.userId, userId));

        if (result.length === 0) {
            return null;
        }

        const dbUser = result[0];

        return dbUser ? dbUser : null;
    }

    public async registerMinimalUser(
        walletAddress: string
    ): Promise<User | null> {
        try {
            const userId = this.generateUserId();
            await db.insert(users).values({
                userId,
                walletAddress,
                email: "",
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            return this.getUserById(userId);
        } catch (error) {
            console.error("Error registering user:", error);
            throw new Error("Failed to register user");
        }
    }

    public async updateUserById(
        userId: string,
        updates: User
    ): Promise<User | null> {
        const matchingUser = await this.getUserById(userId);
        if (!matchingUser) {
            throw new Error("User not found");
        }

        await db
            .update(users)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(users.userId, userId));

        return this.getUserById(userId);
    }
}
