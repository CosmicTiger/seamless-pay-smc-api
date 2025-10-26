import type { HardhatRuntimeEnvironment } from "hardhat/types";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    viem: any;
  }
}
