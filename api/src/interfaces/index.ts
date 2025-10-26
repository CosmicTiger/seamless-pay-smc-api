import type { default as Controller } from "./controller.interface";
export * from "./order.interface";

// NOTE: Do to be able to use 'export default' with an interface, we export like this
// Especially because is considered as type by TS
export type { Controller };
