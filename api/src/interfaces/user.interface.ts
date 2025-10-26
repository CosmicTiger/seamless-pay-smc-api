export interface User {
    userId: string;
    walletAddress: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    phoneNumber?: string | null;
    hasOwnBusiness: boolean;
    createdAt: Date;
    updatedAt?: Date;
}
