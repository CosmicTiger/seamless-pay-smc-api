import { z } from "zod";

// TODO: Esto es para login, simplemente boilerplate de ejemplo para entender cómo funciona Zod
export const userLoginSchema = z.object({
    email: z
        .string()
        .min(1, { message: "This field has to be filled in order to login." })
        .email("This is not a valid email."),
});
