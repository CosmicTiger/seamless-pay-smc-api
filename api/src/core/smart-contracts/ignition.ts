import path from "node:path";
import fs from "node:fs";
import hardhatAppConfig from "../config/hardhat-app.config";

/**
 * Read Ignition's deployed address for a future like "Greeter#greeter"
 * from ignition/deployments/chain-<id>/deployed_addresses.json
 */
export function getDeployedAddress(chainId: number, futureId: string) {
    // default folder name is chain-<chainId> unless --deployment-id used
    // see: Hardhat Ignition deployment artifacts docs
    const folder = path.join(
        hardhatAppConfig.contractsDir,
        "ignition",
        "deployments",
        `chain-${chainId}`
    );
    const mapPath = path.join(folder, "deployed_addresses.json");
    const json = JSON.parse(fs.readFileSync(mapPath, "utf-8"));
    const address = json[futureId];
    if (!address)
        throw new Error(`Address for ${futureId} not found in ${mapPath}`);
    return address as `0x${string}`;
}

/**
 * Load ABI directly from Hardhat artifact json:
 * artifacts/contracts/<File>.sol/<Contract>.json
 */
export function loadAbi(fileSol: string, contract: string) {
    const artifactPath = path.join(
        hardhatAppConfig.contractsDir,
        "artifacts",
        "contracts",
        fileSol,
        `${contract}.json`
    );
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    return artifact.abi as any[];
}
