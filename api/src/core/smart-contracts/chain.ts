import { defineChain } from "viem";
import hardhatAppConfig from "../config/hardhat-app.config";
import omit from "../../utils/omit";

export const hardhatLocal = defineChain(
    omit(hardhatAppConfig, ["contractsDir"])
);
