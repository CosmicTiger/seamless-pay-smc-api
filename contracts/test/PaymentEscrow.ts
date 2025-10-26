import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { parseUnits, keccak256, toHex } from "viem";

describe("PaymentEscrow", function () {
    // Fixture to deploy contracts
    async function deployEscrowFixture() {
        const [owner, vendor, buyer, otherAccount] = await hre.viem.getWalletClients();

        // Deploy MockPYUSD
        const pyusd = await hre.viem.deployContract("MockPYUSD");

        // Deploy PaymentEscrow
        const escrow = await hre.viem.deployContract("PaymentEscrow", [
            pyusd.address,
        ]);

        const publicClient = await hre.viem.getPublicClient();

        return {
            escrow,
            pyusd,
            owner,
            vendor,
            buyer,
            otherAccount,
            publicClient,
        };
    }

    describe("Deployment", function () {
        it("Should set the right PYUSD token", async function () {
            const { escrow, pyusd } = await loadFixture(deployEscrowFixture);

            expect(await escrow.read.pyusdToken()).to.equal(pyusd.address);
        });

        it("Should set the right owner", async function () {
            const { escrow, owner } = await loadFixture(deployEscrowFixture);

            expect(await escrow.read.owner()).to.equal(
                owner.account.address.toLowerCase()
            );
        });

        it("Should revert if PYUSD address is zero", async function () {
            await expect(
                hre.viem.deployContract("PaymentEscrow", [
                    "0x0000000000000000000000000000000000000000",
                ])
            ).to.be.rejectedWith("InvalidAddress");
        });
    });

    describe("Create Escrow", function () {
        it("Should create a new escrow order", async function () {
            const { escrow, vendor, owner } = await loadFixture(
                deployEscrowFixture
            );

            const orderId = keccak256(toHex("ORDER-001"));
            const amount = parseUnits("100", 6); // 100 PYUSD

            const hash = await escrow.write.createEscrow(
                [orderId, vendor.account.address, amount],
                { account: owner.account }
            );

            // Verify event was emitted
            const publicClient = await hre.viem.getPublicClient();
            const receipt = await publicClient.waitForTransactionReceipt({
                hash,
            });

            // Get escrow details
            const escrowData = await escrow.read.getEscrow([orderId]);

            expect(escrowData[0]).to.equal(orderId); // orderId
            expect(escrowData[2].toLowerCase()).to.equal(
                vendor.account.address.toLowerCase()
            ); // vendor
            expect(escrowData[3]).to.equal(amount); // amount
            expect(escrowData[4]).to.equal(0); // state: CREATED
        });

        it("Should revert if vendor address is zero", async function () {
            const { escrow, owner } = await loadFixture(deployEscrowFixture);

            const orderId = keccak256(toHex("ORDER-002"));
            const amount = parseUnits("100", 6);

            await expect(
                escrow.write.createEscrow(
                    [
                        orderId,
                        "0x0000000000000000000000000000000000000000",
                        amount,
                    ],
                    { account: owner.account }
                )
            ).to.be.rejectedWith("InvalidAddress");
        });

        it("Should revert if amount is zero", async function () {
            const { escrow, vendor, owner } = await loadFixture(
                deployEscrowFixture
            );

            const orderId = keccak256(toHex("ORDER-003"));

            await expect(
                escrow.write.createEscrow(
                    [orderId, vendor.account.address, 0n],
                    { account: owner.account }
                )
            ).to.be.rejectedWith("InvalidAmount");
        });

        it("Should revert if order already exists", async function () {
            const { escrow, vendor, owner } = await loadFixture(
                deployEscrowFixture
            );

            const orderId = keccak256(toHex("ORDER-004"));
            const amount = parseUnits("100", 6);

            // Create first time
            await escrow.write.createEscrow(
                [orderId, vendor.account.address, amount],
                { account: owner.account }
            );

            // Try to create again
            await expect(
                escrow.write.createEscrow(
                    [orderId, vendor.account.address, amount],
                    { account: owner.account }
                )
            ).to.be.rejectedWith("OrderAlreadyExists");
        });

        it("Should revert if caller is not owner", async function () {
            const { escrow, vendor, otherAccount } = await loadFixture(
                deployEscrowFixture
            );

            const orderId = keccak256(toHex("ORDER-005"));
            const amount = parseUnits("100", 6);

            await expect(
                escrow.write.createEscrow(
                    [orderId, vendor.account.address, amount],
                    { account: otherAccount.account }
                )
            ).to.be.rejected;
        });
    });

    describe("Fund Escrow", function () {
        it("Should fund an escrow order", async function () {
            const { escrow, pyusd, vendor, buyer, owner } = await loadFixture(
                deployEscrowFixture
            );

            const orderId = keccak256(toHex("ORDER-010"));
            const amount = parseUnits("100", 6);

            // Create escrow
            await escrow.write.createEscrow(
                [orderId, vendor.account.address, amount],
                { account: owner.account }
            );

            // Mint PYUSD to buyer
            await pyusd.write.mint([buyer.account.address, amount]);

            // Approve escrow contract
            await pyusd.write.approve([escrow.address, amount], {
                account: buyer.account,
            });

            // Fund escrow
            const hash = await escrow.write.fundEscrow([orderId], {
                account: buyer.account,
            });

            // Verify escrow state
            const escrowData = await escrow.read.getEscrow([orderId]);
            expect(escrowData[1].toLowerCase()).to.equal(
                buyer.account.address.toLowerCase()
            ); // buyer
            expect(escrowData[4]).to.equal(1); // state: FUNDED

            // Verify balance
            const escrowBalance = await pyusd.read.balanceOf([escrow.address]);
            expect(escrowBalance).to.equal(amount);
        });

        it("Should revert if order not found", async function () {
            const { escrow, buyer } = await loadFixture(deployEscrowFixture);

            const orderId = keccak256(toHex("ORDER-INVALID"));

            await expect(
                escrow.write.fundEscrow([orderId], {
                    account: buyer.account,
                })
            ).to.be.rejectedWith("OrderNotFound");
        });

        it("Should revert if already funded", async function () {
            const { escrow, pyusd, vendor, buyer, owner } = await loadFixture(
                deployEscrowFixture
            );

            const orderId = keccak256(toHex("ORDER-011"));
            const amount = parseUnits("100", 6);

            // Create escrow
            await escrow.write.createEscrow(
                [orderId, vendor.account.address, amount],
                { account: owner.account }
            );

            // Mint PYUSD to buyer
            await pyusd.write.mint([buyer.account.address, amount * 2n]);

            // Approve escrow contract
            await pyusd.write.approve([escrow.address, amount * 2n], {
                account: buyer.account,
            });

            // Fund escrow first time
            await escrow.write.fundEscrow([orderId], {
                account: buyer.account,
            });

            // Try to fund again
            await expect(
                escrow.write.fundEscrow([orderId], {
                    account: buyer.account,
                })
            ).to.be.rejectedWith("OrderAlreadyFunded");
        });

        it("Should revert if insufficient allowance", async function () {
            const { escrow, pyusd, vendor, buyer, owner } = await loadFixture(
                deployEscrowFixture
            );

            const orderId = keccak256(toHex("ORDER-012"));
            const amount = parseUnits("100", 6);

            // Create escrow
            await escrow.write.createEscrow(
                [orderId, vendor.account.address, amount],
                { account: owner.account }
            );

            // Mint PYUSD to buyer
            await pyusd.write.mint([buyer.account.address, amount]);

            // Don't approve or approve less
            await pyusd.write.approve([escrow.address, amount / 2n], {
                account: buyer.account,
            });

            // Try to fund escrow
            await expect(
                escrow.write.fundEscrow([orderId], {
                    account: buyer.account,
                })
            ).to.be.rejectedWith("InsufficientAllowance");
        });
    });

    describe("Release Funds", function () {
        it("Should release funds to vendor", async function () {
            const { escrow, pyusd, vendor, buyer, owner } = await loadFixture(
                deployEscrowFixture
            );

            const orderId = keccak256(toHex("ORDER-020"));
            const amount = parseUnits("100", 6);

            // Create and fund escrow
            await escrow.write.createEscrow(
                [orderId, vendor.account.address, amount],
                { account: owner.account }
            );
            await pyusd.write.mint([buyer.account.address, amount]);
            await pyusd.write.approve([escrow.address, amount], {
                account: buyer.account,
            });
            await escrow.write.fundEscrow([orderId], {
                account: buyer.account,
            });

            const vendorBalanceBefore = await pyusd.read.balanceOf([
                vendor.account.address,
            ]);

            // Release funds
            await escrow.write.releaseFunds([orderId], {
                account: owner.account,
            });

            // Verify vendor balance
            const vendorBalanceAfter = await pyusd.read.balanceOf([
                vendor.account.address,
            ]);
            expect(vendorBalanceAfter - vendorBalanceBefore).to.equal(amount);

            // Verify escrow state
            const escrowData = await escrow.read.getEscrow([orderId]);
            expect(escrowData[4]).to.equal(2); // state: RELEASED
        });

        it("Should revert if order not funded", async function () {
            const { escrow, vendor, owner } = await loadFixture(
                deployEscrowFixture
            );

            const orderId = keccak256(toHex("ORDER-021"));
            const amount = parseUnits("100", 6);

            // Create but don't fund
            await escrow.write.createEscrow(
                [orderId, vendor.account.address, amount],
                { account: owner.account }
            );

            await expect(
                escrow.write.releaseFunds([orderId], {
                    account: owner.account,
                })
            ).to.be.rejectedWith("OrderNotFunded");
        });

        it("Should revert if caller is not owner", async function () {
            const { escrow, pyusd, vendor, buyer, owner, otherAccount } =
                await loadFixture(deployEscrowFixture);

            const orderId = keccak256(toHex("ORDER-022"));
            const amount = parseUnits("100", 6);

            // Create and fund escrow
            await escrow.write.createEscrow(
                [orderId, vendor.account.address, amount],
                { account: owner.account }
            );
            await pyusd.write.mint([buyer.account.address, amount]);
            await pyusd.write.approve([escrow.address, amount], {
                account: buyer.account,
            });
            await escrow.write.fundEscrow([orderId], {
                account: buyer.account,
            });

            // Try to release with non-owner account
            await expect(
                escrow.write.releaseFunds([orderId], {
                    account: otherAccount.account,
                })
            ).to.be.rejected;
        });
    });

    describe("Refund Funds", function () {
        it("Should refund funds to buyer", async function () {
            const { escrow, pyusd, vendor, buyer, owner } = await loadFixture(
                deployEscrowFixture
            );

            const orderId = keccak256(toHex("ORDER-030"));
            const amount = parseUnits("100", 6);

            // Create and fund escrow
            await escrow.write.createEscrow(
                [orderId, vendor.account.address, amount],
                { account: owner.account }
            );
            await pyusd.write.mint([buyer.account.address, amount]);
            await pyusd.write.approve([escrow.address, amount], {
                account: buyer.account,
            });
            await escrow.write.fundEscrow([orderId], {
                account: buyer.account,
            });

            const buyerBalanceBefore = await pyusd.read.balanceOf([
                buyer.account.address,
            ]);

            // Refund funds
            await escrow.write.refundFunds([orderId], {
                account: owner.account,
            });

            // Verify buyer balance
            const buyerBalanceAfter = await pyusd.read.balanceOf([
                buyer.account.address,
            ]);
            expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(amount);

            // Verify escrow state
            const escrowData = await escrow.read.getEscrow([orderId]);
            expect(escrowData[4]).to.equal(3); // state: REFUNDED
        });
    });

    describe("Utility Functions", function () {
        it("Should check if order exists", async function () {
            const { escrow, vendor, owner } = await loadFixture(
                deployEscrowFixture
            );

            const orderId = keccak256(toHex("ORDER-040"));
            const amount = parseUnits("100", 6);

            expect(await escrow.read.orderExists([orderId])).to.be.false;

            await escrow.write.createEscrow(
                [orderId, vendor.account.address, amount],
                { account: owner.account }
            );

            expect(await escrow.read.orderExists([orderId])).to.be.true;
        });

        it("Should get contract balance", async function () {
            const { escrow, pyusd, vendor, buyer, owner } = await loadFixture(
                deployEscrowFixture
            );

            const orderId = keccak256(toHex("ORDER-041"));
            const amount = parseUnits("100", 6);

            expect(await escrow.read.getBalance()).to.equal(0n);

            // Create and fund escrow
            await escrow.write.createEscrow(
                [orderId, vendor.account.address, amount],
                { account: owner.account }
            );
            await pyusd.write.mint([buyer.account.address, amount]);
            await pyusd.write.approve([escrow.address, amount], {
                account: buyer.account,
            });
            await escrow.write.fundEscrow([orderId], {
                account: buyer.account,
            });

            expect(await escrow.read.getBalance()).to.equal(amount);
        });
    });
});
