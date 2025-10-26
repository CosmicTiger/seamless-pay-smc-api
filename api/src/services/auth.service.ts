import { ethers } from "ethers";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { User } from "../interfaces/user.interface";

class AuthService {
    private generateUserId(): string {
        return `USR-${randomUUID()}`;
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

export default AuthService;
