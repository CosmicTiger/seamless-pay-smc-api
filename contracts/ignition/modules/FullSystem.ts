import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Complete system deployment module
 * Deploys MockPYUSD + PaymentEscrow for local testing
 * 
 * Usage:
 *    npx hardhat ignition deploy ignition/modules/FullSystem.ts
 */

export default buildModule("FullSystemModule", (m) => {
  // Deploy MockPYUSD for local testing
  const mockPYUSD = m.contract("MockPYUSD");

  // Deploy PaymentEscrow with MockPYUSD address
  const paymentEscrow = m.contract("PaymentEscrow", [mockPYUSD]);

  return { mockPYUSD, paymentEscrow };
});
