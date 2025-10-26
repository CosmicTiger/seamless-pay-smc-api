# PaymentEscrow Smart Contracts

Smart contracts for PYUSD payment escrow system on Ethereum (Sepolia testnet).

This project uses Hardhat 3 with support for:
- Solidity tests (Foundry-compatible)
- TypeScript tests with `node:test` and `viem`
- Deployment with Hardhat Ignition
- Automatic verification on Blockscout/Etherscan

## Contracts

- **`PaymentEscrow.sol`** - Main escrow contract for PYUSD payments
- **`MockPYUSD.sol`** - Mock PYUSD token for local testing
- **`PaymentEscrow.t.sol`** - Complete Solidity test suite (19 tests)

## Tests

### Run Solidity Tests

To run the complete PaymentEscrow contract test suite:

```shell
npx hardhat test contracts/PaymentEscrow.t.sol
```

**Test Coverage (19 tests):**
- ✅ Deployment and initial configuration
- ✅ Escrow order creation
- ✅ Buyer funding
- ✅ Funds release to vendor
- ✅ Refunds to buyer
- ✅ Dispute handling
- ✅ Fuzz testing (256 runs)
- ✅ Complete end-to-end flow

### Run All Tests

```shell
npx hardhat test
```

Or selectively:

```shell
npx hardhat test solidity
npx hardhat test nodejs
```

## 🚀 Deployment

### Step 1: Variable Configuration

Configure environment variables using Hardhat Keystore (secure encrypted storage):

```shell
# Set Sepolia RPC URL
npx hardhat keystore set SEPOLIA_RPC_URL

# Set your private key (you'll be prompted for an encryption password)
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

**Note:** You can also use a `.env` file with the following variables:
```env
SEPOLIA_RPC_URL=https://rpc.sepolia.org
SEPOLIA_PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=your_api_key_here
```

### Step 2: Local Deployment (Testing)

Deploy the complete system (MockPYUSD + PaymentEscrow) locally:

```shell
npx hardhat ignition deploy ignition/modules/FullSystem.ts
```

### Step 3: Sepolia Testnet Deployment

Deploy PaymentEscrow on Sepolia using real PYUSD:

```shell
npx hardhat ignition deploy ignition/modules/PaymentEscrow.ts --network sepolia
```

**Interactive Process:**
1. You'll be prompted for the keystore password
2. Confirm deployment to Sepolia (chain ID: 11155111)
3. The contract will be deployed

**Deployed Addresses (Example):**
```
PaymentEscrowModule#PaymentEscrow - 0xf43A12BDD996997705155c8b6b1C569FDc786966
```

### Step 4: Contract Verification

Verify the contract on Blockscout/Etherscan:

```shell
npx hardhat verify --network sepolia \
  0xf43A12BDD996997705155c8b6b1C569FDc786966 \
  "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"
```

**Parameters:**
- `0xf43A12BDD996997705155c8b6b1C569FDc786966` - Deployed contract address
- `"0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"` - PYUSD token address on Sepolia (constructor param)

**Result:**
```
✅ Contract verified successfully on Blockscout!
Explorer: https://eth-sepolia.blockscout.com/address/0xf43A12BDD996997705155c8b6b1C569FDc786966#code
```

### Available Ignition Modules

- **`FullSystem.ts`** - Deploys MockPYUSD + PaymentEscrow (local testing)
- **`PaymentEscrow.ts`** - Deploys only PaymentEscrow with real PYUSD (testnets/mainnet)
- **`Counter.ts`** - Example contract

## 🔑 PYUSD Configuration

### Sepolia Testnet
- **PYUSD Address:** `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`
- **Decimals:** 6
- **Faucet:** [PayPal Developer Portal](https://developer.paypal.com/)

## Project Summary

### Deployed Contracts
| Contract | Address | Network | Explorer |
|----------|---------|---------|----------|
| PaymentEscrow | `0xf43A12BDD996997705155c8b6b1C569FDc786966` | Sepolia | [Blockscout](https://eth-sepolia.blockscout.com/address/0xf43A12BDD996997705155c8b6b1C569FDc786966#code) |
| PYUSD (Testnet) | `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9` | Sepolia | [Etherscan](https://sepolia.etherscan.io/token/0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9) |

### PaymentEscrow Contract Functions

- **createEscrow** - Creates a new escrow order (owner only)
- **fundEscrow** - Buyer funds the escrow with PYUSD
- **releaseFunds** - Releases funds to vendor (owner only)
- **refundFunds** - Refunds funds to buyer (owner only)
- **markAsDisputed** - Marks an order as disputed (owner only)
- **getEscrow** - Gets order details
- **orderExists** - Checks if an order exists
- **getBalance** - Gets the contract's PYUSD balance

## Tech Stack

- **Hardhat 3** - Development framework
- **Solidity 0.8.28** - Contract language
- **Hardhat Ignition** - Deployment system
- **Foundry (forge-std)** - Contract testing
- **OpenZeppelin Contracts** - Secure libraries (Ownable, ReentrancyGuard, ERC20)
- **Viem** - Ethereum client for TypeScript
- **Hardhat Keystore** - Secure private key management

## 📚 Additional Resources

- [Hardhat 3 Documentation](https://hardhat.org/docs/learn-more/deploying-contracts)
- [Hardhat Ignition](https://hardhat.org/ignition)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [PYUSD Documentation](https://developer.paypal.com/community/blog/introducing-pyusd/)
- [Blockscout Explorer](https://eth-sepolia.blockscout.com/)

## Security

- Uses `ReentrancyGuard` to prevent reentrancy attacks
- Implements `Ownable` for access control
- Custom errors for gas efficiency
- 19 unit tests with 100% coverage of critical flows

## Notes

- The contract uses PYUSD which has **6 decimals** (not 18 like ETH)
- Hardhat keystore encrypts your private keys with a password
- Automatic verification works with Blockscout (Etherscan requires API key)
