import { z } from "zod";

export const verifySignatureSchema = z.object({
    signature: z
        .string()
        .min(1, { message: "This field has to be filled in order to login." }),
    message: z
        .string()
        .min(1, { message: "This field has to be filled in order to login." }),
});
// Schema for the route that accepts a userId as a route param/query
// and a payload to fill-out the user's profile.
// The controller currently mounts the route at `/fill-out-profile/:userId`.
export const userIdParamSchema = z.object({
    userId: z.string().min(1, { message: "userId is required" }),
});

// Body payload for completing a user profile. Keep required fields minimal
// (email) and allow some optional fields that are common for profiles.
export const fillOutProfileSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    fullName: z.string().optional(),
    phone: z.string().min(1).optional(),
    // Add other profile fields here if needed, e.g. avatarUrl, bio, etc.
});

// Re-export inferred types for controller typing convenience
export type VerifySignature = z.infer<typeof verifySignatureSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type FillOutProfileBody = z.infer<typeof fillOutProfileSchema>;
// (Named exports are already declared above; no extra re-export block needed.)
