// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {PaymentEscrow} from "./PaymentEscrow.sol";
import {MockPYUSD} from "./MockPYUSD.sol";

contract PaymentEscrowTest is Test {
    PaymentEscrow public escrow;
    MockPYUSD public pyusd;
    
    address public owner;
    address public vendor;
    address public buyer;
    
    function setUp() public {
        owner = address(this);
        vendor = makeAddr("vendor");
        buyer = makeAddr("buyer");
        
        // Deploy contracts
        pyusd = new MockPYUSD();
        escrow = new PaymentEscrow(address(pyusd));
        
        // Mint tokens to buyer
        pyusd.mint(buyer, 1000 * 10**6); // 1000 PYUSD
    }
    
    // ============ Deployment Tests ============
    
    function test_Deployment() public view {
        assertEq(address(escrow.pyusdToken()), address(pyusd));
        assertEq(escrow.owner(), owner);
        assertEq(escrow.getBalance(), 0);
    }
    
    // ============ Create Escrow Tests ============
    
    function test_CreateEscrow() public {
        bytes32 orderId = keccak256("ORDER-001");
        uint256 amount = 100 * 10**6; // 100 PYUSD
        
        vm.expectEmit(true, true, true, true);
        emit PaymentEscrow.EscrowCreated(orderId, vendor, amount);
        
        escrow.createEscrow(orderId, vendor, amount);
        
        PaymentEscrow.EscrowOrder memory order = escrow.getEscrow(orderId);
        
        assertEq(order.orderId, orderId);
        assertEq(order.vendor, vendor);
        assertEq(order.buyer, address(0));
        assertEq(order.amount, amount);
        assertEq(uint8(order.state), uint8(PaymentEscrow.EscrowState.CREATED));
    }
    
    function test_RevertWhen_CreateEscrowNotOwner() public {
        bytes32 orderId = keccak256("ORDER-002");
        
        vm.prank(buyer);
        vm.expectRevert();
        escrow.createEscrow(orderId, vendor, 100 * 10**6);
    }
    
    function test_RevertWhen_CreateEscrowZeroAmount() public {
        bytes32 orderId = keccak256("ORDER-003");
        
        vm.expectRevert(PaymentEscrow.InvalidAmount.selector);
        escrow.createEscrow(orderId, vendor, 0);
    }
    
    function test_RevertWhen_CreateEscrowAlreadyExists() public {
        bytes32 orderId = keccak256("ORDER-004");
        uint256 amount = 100 * 10**6;
        
        escrow.createEscrow(orderId, vendor, amount);
        
        vm.expectRevert(PaymentEscrow.OrderAlreadyExists.selector);
        escrow.createEscrow(orderId, vendor, amount);
    }
    
    // ============ Fund Escrow Tests ============
    
    function test_FundEscrow() public {
        bytes32 orderId = keccak256("ORDER-005");
        uint256 amount = 100 * 10**6;
        
        escrow.createEscrow(orderId, vendor, amount);
        
        // Buyer approves and funds
        vm.startPrank(buyer);
        pyusd.approve(address(escrow), amount);
        
        vm.expectEmit(true, true, true, true);
        emit PaymentEscrow.EscrowFunded(orderId, buyer, amount);
        
        escrow.fundEscrow(orderId);
        vm.stopPrank();
        
        PaymentEscrow.EscrowOrder memory order = escrow.getEscrow(orderId);
        
        assertEq(order.buyer, buyer);
        assertEq(uint8(order.state), uint8(PaymentEscrow.EscrowState.FUNDED));
        assertEq(pyusd.balanceOf(address(escrow)), amount);
    }
    
    function test_RevertWhen_FundEscrowNotCreated() public {
        bytes32 orderId = keccak256("ORDER-INVALID");
        
        vm.prank(buyer);
        vm.expectRevert(PaymentEscrow.OrderNotFound.selector);
        escrow.fundEscrow(orderId);
    }
    
    function test_RevertWhen_FundEscrowInsufficientBalance() public {
        bytes32 orderId = keccak256("ORDER-006");
        uint256 amount = 2000 * 10**6; // More than buyer has
        
        escrow.createEscrow(orderId, vendor, amount);
        
        vm.startPrank(buyer);
        pyusd.approve(address(escrow), amount);
        
        vm.expectRevert();
        escrow.fundEscrow(orderId);
        vm.stopPrank();
    }
    
    // ============ Release Funds Tests ============
    
    function test_ReleaseFunds() public {
        bytes32 orderId = keccak256("ORDER-007");
        uint256 amount = 100 * 10**6;
        
        // Create and fund escrow
        escrow.createEscrow(orderId, vendor, amount);
        
        vm.startPrank(buyer);
        pyusd.approve(address(escrow), amount);
        escrow.fundEscrow(orderId);
        vm.stopPrank();
        
        // Release funds
        uint256 vendorBalanceBefore = pyusd.balanceOf(vendor);
        
        vm.expectEmit(true, true, true, true);
        emit PaymentEscrow.EscrowReleased(orderId, vendor, amount);
        
        escrow.releaseFunds(orderId);
        
        PaymentEscrow.EscrowOrder memory order = escrow.getEscrow(orderId);
        
        assertEq(uint8(order.state), uint8(PaymentEscrow.EscrowState.RELEASED));
        assertEq(pyusd.balanceOf(vendor), vendorBalanceBefore + amount);
        assertEq(pyusd.balanceOf(address(escrow)), 0);
    }
    
    function test_CompleteEscrowFlow() public {
        bytes32 orderId = keccak256("ORDER-COMPLETE-FLOW");
        uint256 amount = 150 * 10**6;
        
        console.log("=== Test: Complete Escrow Flow ===");
        console.log("Order ID:", uint256(orderId));
        console.log("Amount:", amount, "PYUSD (150.00)");
        
        // Step 1: Create escrow
        console.log("\n[Step 1] Creating escrow...");
        console.log("Vendor:", vendor);
        escrow.createEscrow(orderId, vendor, amount);
        PaymentEscrow.EscrowOrder memory order = escrow.getEscrow(orderId);
        assertEq(uint8(order.state), uint8(PaymentEscrow.EscrowState.CREATED));
        console.log("Status: CREATED");
        
        // Step 2: Buyer funds escrow
        console.log("\n[Step 2] Buyer funding escrow...");
        console.log("Buyer:", buyer);
        console.log("Buyer balance before:", pyusd.balanceOf(buyer));
        
        vm.startPrank(buyer);
        pyusd.approve(address(escrow), amount);
        escrow.fundEscrow(orderId);
        vm.stopPrank();
        
        order = escrow.getEscrow(orderId);
        assertEq(uint8(order.state), uint8(PaymentEscrow.EscrowState.FUNDED));
        assertEq(order.buyer, buyer);
        console.log("Status: FUNDED");
        console.log("Buyer balance after:", pyusd.balanceOf(buyer));
        console.log("Escrow balance:", escrow.getBalance());
        
        // Step 3: Release funds to vendor
        console.log("\n[Step 3] Releasing funds to vendor...");
        uint256 vendorBalanceBefore = pyusd.balanceOf(vendor);
        console.log("Vendor balance before:", vendorBalanceBefore);
        
        escrow.releaseFunds(orderId);
        
        order = escrow.getEscrow(orderId);
        assertEq(uint8(order.state), uint8(PaymentEscrow.EscrowState.RELEASED));
        assertEq(pyusd.balanceOf(vendor), vendorBalanceBefore + amount);
        assertEq(escrow.getBalance(), 0);
        
        console.log("Status: RELEASED");
        console.log("Vendor balance after:", pyusd.balanceOf(vendor));
        console.log("Escrow balance:", escrow.getBalance());
        console.log("\n=== Test completed successfully! ===\n");
    }
    
    function test_RevertWhen_ReleaseFundsNotOwner() public {
        bytes32 orderId = keccak256("ORDER-008");
        uint256 amount = 100 * 10**6;
        
        escrow.createEscrow(orderId, vendor, amount);
        
        vm.startPrank(buyer);
        pyusd.approve(address(escrow), amount);
        escrow.fundEscrow(orderId);
        
        vm.expectRevert();
        escrow.releaseFunds(orderId);
        vm.stopPrank();
    }
    
    function test_RevertWhen_ReleaseFundsNotFunded() public {
        bytes32 orderId = keccak256("ORDER-009");
        
        escrow.createEscrow(orderId, vendor, 100 * 10**6);
        
        vm.expectRevert(PaymentEscrow.OrderNotFunded.selector);
        escrow.releaseFunds(orderId);
    }
    
    function test_RevertWhen_ReleaseFundsDisputed() public {
        bytes32 orderId = keccak256("ORDER-010");
        uint256 amount = 100 * 10**6;
        
        escrow.createEscrow(orderId, vendor, amount);
        
        vm.startPrank(buyer);
        pyusd.approve(address(escrow), amount);
        escrow.fundEscrow(orderId);
        vm.stopPrank();
        
        // Mark as disputed
        escrow.markAsDisputed(orderId);
        
        vm.expectRevert(PaymentEscrow.OrderNotFunded.selector);
        escrow.releaseFunds(orderId);
    }
    
    // ============ Refund Tests ============
    
    function test_RefundFunds() public {
        bytes32 orderId = keccak256("ORDER-011");
        uint256 amount = 100 * 10**6;
        
        // Create and fund escrow
        escrow.createEscrow(orderId, vendor, amount);
        
        vm.startPrank(buyer);
        pyusd.approve(address(escrow), amount);
        escrow.fundEscrow(orderId);
        vm.stopPrank();
        
        // Refund
        uint256 buyerBalanceBefore = pyusd.balanceOf(buyer);
        
        vm.expectEmit(true, true, true, true);
        emit PaymentEscrow.EscrowRefunded(orderId, buyer, amount);
        
        escrow.refundFunds(orderId);
        
        PaymentEscrow.EscrowOrder memory order = escrow.getEscrow(orderId);
        
        assertEq(uint8(order.state), uint8(PaymentEscrow.EscrowState.REFUNDED));
        assertEq(pyusd.balanceOf(buyer), buyerBalanceBefore + amount);
        assertEq(pyusd.balanceOf(address(escrow)), 0);
    }
    
    function test_RevertWhen_RefundFundsNotOwner() public {
        bytes32 orderId = keccak256("ORDER-012");
        uint256 amount = 100 * 10**6;
        
        escrow.createEscrow(orderId, vendor, amount);
        
        vm.startPrank(buyer);
        pyusd.approve(address(escrow), amount);
        escrow.fundEscrow(orderId);
        
        vm.expectRevert();
        escrow.refundFunds(orderId);
        vm.stopPrank();
    }
    
    function test_RevertWhen_RefundNoBuyer() public {
        bytes32 orderId = keccak256("ORDER-013");
        
        escrow.createEscrow(orderId, vendor, 100 * 10**6);
        
        vm.expectRevert(PaymentEscrow.OrderNotFunded.selector);
        escrow.refundFunds(orderId);
    }
    
    // ============ Dispute Tests ============
    
    function test_MarkAsDisputed() public {
        bytes32 orderId = keccak256("ORDER-014");
        uint256 amount = 100 * 10**6;
        
        escrow.createEscrow(orderId, vendor, amount);
        
        vm.startPrank(buyer);
        pyusd.approve(address(escrow), amount);
        escrow.fundEscrow(orderId);
        vm.stopPrank();
        
        vm.expectEmit(true, true, true, true);
        emit PaymentEscrow.EscrowDisputed(orderId);
        
        escrow.markAsDisputed(orderId);
        
        PaymentEscrow.EscrowOrder memory order = escrow.getEscrow(orderId);
        assertEq(uint8(order.state), uint8(PaymentEscrow.EscrowState.DISPUTED));
    }
    
    function test_RevertWhen_MarkAsDisputedNotOwner() public {
        bytes32 orderId = keccak256("ORDER-015");
        
        escrow.createEscrow(orderId, vendor, 100 * 10**6);
        
        vm.prank(buyer);
        vm.expectRevert();
        escrow.markAsDisputed(orderId);
    }
    
    // ============ Fuzz Tests ============
    
    function testFuzz_CreateAndFundEscrow(uint256 amount) public {
        vm.assume(amount > 0 && amount <= 1000 * 10**6);
        
        bytes32 orderId = keccak256(abi.encodePacked("FUZZ", amount));
        
        escrow.createEscrow(orderId, vendor, amount);
        
        vm.startPrank(buyer);
        pyusd.approve(address(escrow), amount);
        escrow.fundEscrow(orderId);
        vm.stopPrank();
        
        PaymentEscrow.EscrowOrder memory order = escrow.getEscrow(orderId);
        
        assertEq(order.amount, amount);
        assertEq(uint8(order.state), uint8(PaymentEscrow.EscrowState.FUNDED));
    }
}
