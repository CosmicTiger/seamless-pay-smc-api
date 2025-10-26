// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PaymentEscrow
 * @dev Escrow contract for PYUSD payment processing
 * Holds funds temporarily and releases them based on arbitration
 */
contract PaymentEscrow is Ownable, ReentrancyGuard {
    // PYUSD token contract
    IERC20 public immutable pyusdToken;

    // Escrow states
    enum EscrowState {
        CREATED,
        FUNDED,
        RELEASED,
        REFUNDED,
        DISPUTED
    }

    // Escrow order structure
    struct EscrowOrder {
        bytes32 orderId;
        address buyer;
        address vendor;
        uint256 amount;
        EscrowState state;
        uint256 createdAt;
        uint256 updatedAt;
    }

    // Mapping from order ID to escrow order
    mapping(bytes32 => EscrowOrder) public escrows;

    // Events
    event EscrowCreated(
        bytes32 indexed orderId,
        address indexed vendor,
        uint256 amount
    );

    event EscrowFunded(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 amount
    );

    event EscrowReleased(
        bytes32 indexed orderId,
        address indexed vendor,
        uint256 amount
    );

    event EscrowRefunded(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 amount
    );

    event EscrowDisputed(bytes32 indexed orderId);

    // Errors
    error InvalidAmount();
    error InvalidAddress();
    error OrderAlreadyExists();
    error OrderNotFound();
    error OrderNotFunded();
    error OrderAlreadyFunded();
    error InvalidState();
    error InsufficientAllowance();
    error TransferFailed();

    /**
     * @dev Constructor
     * @param _pyusdToken Address of the PYUSD token contract
     */
    constructor(address _pyusdToken) Ownable(msg.sender) {
        if (_pyusdToken == address(0)) revert InvalidAddress();
        pyusdToken = IERC20(_pyusdToken);
    }

    /**
     * @dev Create a new escrow order (called by backend)
     * @param orderId Unique order identifier
     * @param vendor Vendor's wallet address
     * @param amount Amount in PYUSD (with 6 decimals)
     */
    function createEscrow(
        bytes32 orderId,
        address vendor,
        uint256 amount
    ) external onlyOwner {
        if (vendor == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (escrows[orderId].amount != 0) revert OrderAlreadyExists();

        escrows[orderId] = EscrowOrder({
            orderId: orderId,
            buyer: address(0),
            vendor: vendor,
            amount: amount,
            state: EscrowState.CREATED,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        emit EscrowCreated(orderId, vendor, amount);
    }

    /**
     * @dev Fund an escrow order (called by buyer)
     * @param orderId Order identifier
     * The buyer must approve this contract to spend PYUSD first
     */
    function fundEscrow(bytes32 orderId) external nonReentrant {
        EscrowOrder storage escrow = escrows[orderId];

        if (escrow.amount == 0) revert OrderNotFound();
        if (escrow.state != EscrowState.CREATED) revert OrderAlreadyFunded();

        // Check allowance
        uint256 allowance = pyusdToken.allowance(msg.sender, address(this));
        if (allowance < escrow.amount) revert InsufficientAllowance();

        // Transfer PYUSD from buyer to this contract
        bool success = pyusdToken.transferFrom(
            msg.sender,
            address(this),
            escrow.amount
        );
        if (!success) revert TransferFailed();

        // Update escrow state
        escrow.buyer = msg.sender;
        escrow.state = EscrowState.FUNDED;
        escrow.updatedAt = block.timestamp;

        emit EscrowFunded(orderId, msg.sender, escrow.amount);
    }

    /**
     * @dev Release funds to vendor (called by backend/arbitrator)
     * @param orderId Order identifier
     */
    function releaseFunds(bytes32 orderId) external onlyOwner nonReentrant {
        EscrowOrder storage escrow = escrows[orderId];

        if (escrow.amount == 0) revert OrderNotFound();
        if (escrow.state != EscrowState.FUNDED) revert OrderNotFunded();

        // Transfer PYUSD to vendor
        bool success = pyusdToken.transfer(escrow.vendor, escrow.amount);
        if (!success) revert TransferFailed();

        // Update escrow state
        escrow.state = EscrowState.RELEASED;
        escrow.updatedAt = block.timestamp;

        emit EscrowReleased(orderId, escrow.vendor, escrow.amount);
    }

    /**
     * @dev Refund funds to buyer (called by backend/arbitrator)
     * @param orderId Order identifier
     */
    function refundFunds(bytes32 orderId) external onlyOwner nonReentrant {
        EscrowOrder storage escrow = escrows[orderId];

        if (escrow.amount == 0) revert OrderNotFound();
        if (escrow.state != EscrowState.FUNDED) revert OrderNotFunded();
        if (escrow.buyer == address(0)) revert InvalidAddress();

        // Transfer PYUSD back to buyer
        bool success = pyusdToken.transfer(escrow.buyer, escrow.amount);
        if (!success) revert TransferFailed();

        // Update escrow state
        escrow.state = EscrowState.REFUNDED;
        escrow.updatedAt = block.timestamp;

        emit EscrowRefunded(orderId, escrow.buyer, escrow.amount);
    }

    /**
     * @dev Mark order as disputed
     * @param orderId Order identifier
     */
    function markAsDisputed(bytes32 orderId) external onlyOwner {
        EscrowOrder storage escrow = escrows[orderId];

        if (escrow.amount == 0) revert OrderNotFound();
        if (escrow.state != EscrowState.FUNDED) revert InvalidState();

        escrow.state = EscrowState.DISPUTED;
        escrow.updatedAt = block.timestamp;

        emit EscrowDisputed(orderId);
    }

    /**
     * @dev Get escrow details
     * @param orderId Order identifier
     */
    function getEscrow(bytes32 orderId)
        external
        view
        returns (EscrowOrder memory)
    {
        if (escrows[orderId].amount == 0) revert OrderNotFound();
        return escrows[orderId];
    }

    /**
     * @dev Check if order exists
     * @param orderId Order identifier
     */
    function orderExists(bytes32 orderId) external view returns (bool) {
        return escrows[orderId].amount != 0;
    }

    /**
     * @dev Get contract's PYUSD balance
     */
    function getBalance() external view returns (uint256) {
        return pyusdToken.balanceOf(address(this));
    }
}
