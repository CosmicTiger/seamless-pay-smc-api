// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockPYUSD
 * @dev Mock PYUSD token for testing (6 decimals like real PYUSD)
 */
contract MockPYUSD is ERC20 {
    uint8 private constant DECIMALS = 6;

    constructor() ERC20("PayPal USD", "PYUSD") {
        // Mint initial supply to deployer (1 million PYUSD)
        _mint(msg.sender, 1_000_000 * 10**DECIMALS);
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @dev Mint tokens for testing
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
