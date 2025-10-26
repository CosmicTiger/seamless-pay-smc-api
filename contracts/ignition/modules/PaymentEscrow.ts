import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Ignition module for deploying PaymentEscrow contract
 * 
 * Usage:
 * 
 * 1. Local deployment (with mock PYUSD):
 *    npx hardhat ignition deploy ignition/modules/PaymentEscrow.ts
 * 
 * 2. Sepolia deployment (with real PYUSD address):
 *    npx hardhat ignition deploy ignition/modules/PaymentEscrow.ts --network sepolia --parameters ignition/parameters.json
 */

export default buildModule("PaymentEscrowModule", (m) => {
  // Get PYUSD token address from parameters or use default for local testing
  const pyusdAddress = m.getParameter(
    "pyusdAddress",
    "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9" // Sepolia PYUSD default
  );

  // Deploy PaymentEscrow with PYUSD token address
  const paymentEscrow = m.contract("PaymentEscrow", [pyusdAddress]);

  return { paymentEscrow };
});
