import { createPublicClient, createWalletClient, http } from "viem";
import { hardhatLocal } from "../core/smart-contracts/chain";
import { getDeployedAddress, loadAbi } from "../core/smart-contracts/ignition";
import { privateKeyToAccount } from "viem/accounts";

class SmartContractsService {
    private chain = hardhatLocal;
    private transport = http(hardhatLocal.rpcUrls.default.http[0]);
    private publicClient = createPublicClient({
        chain: this.chain,
        transport: this.transport,
    });
    private maybeWallet = process.env.PRIVATE_KEY
        ? createWalletClient({
              chain: this.chain,
              transport: this.transport,
              account: privateKeyToAccount(
                  process.env.PRIVATE_KEY as `0x${string}`
              ),
          })
        : null;
    // NOTE: Resolutions to addresses/ABI once on boot for deployed contracts
    public CONTRACTS_METADATA = {
        Greeter: {
            name: "Greeter",
            future: "Greeter#greeter",
            functions: {
                greeting: "greeting",
                setGreeting: "setGreeting",
            },
        },
    };
    private CONTRACTS_ADDRESSES: Record<
        keyof typeof this.CONTRACTS_METADATA,
        `0x${string}`
    > = {
        Greeter: getDeployedAddress(
            this.chain.id,
            this.CONTRACTS_METADATA.Greeter.future
        ),
    };
    private CONTRACTS_ABI: Record<
        keyof typeof this.CONTRACTS_METADATA,
        unknown[]
    > = {
        Greeter: loadAbi(
            `${this.CONTRACTS_METADATA.Greeter.name}.sol`,
            this.CONTRACTS_METADATA.Greeter.name
        ),
    };

    public async getContractAddress(
        contract: keyof typeof this.CONTRACTS_METADATA,
        address?: `0x${string}`
    ): Promise<object> {
        // Retrieve smart contract information for a known contract name.
        const resolvedAddress = address ?? this.CONTRACTS_ADDRESSES[contract];
        return {
            chainId: this.chain.id,
            address: resolvedAddress,
        };
    }

    public async getContractData(
        contract: keyof typeof this.CONTRACTS_METADATA
    ) {
        const data = await this.publicClient.readContract({
            address: this.CONTRACTS_ADDRESSES[contract],
            abi: this.CONTRACTS_ABI[contract] as any,
            functionName: this.CONTRACTS_METADATA[contract].functions.greeting,
            args: [],
        });

        return data;
    }

    public async writeContractData(
        contract: keyof typeof this.CONTRACTS_METADATA,
        value: string
    ) {
        if (!this.maybeWallet) {
            throw new Error("Wallet client is not configured.");
        }

        // Retrieve smart contract ABI and address for a known contract name.
        const hash = await this.maybeWallet.writeContract({
            address: this.CONTRACTS_ADDRESSES[contract],
            abi: this.CONTRACTS_ABI[contract] as any,
            functionName: this.CONTRACTS_METADATA.Greeter.functions.setGreeting,
            args: [value],
            account: null,
        });

        const receipt = await this.publicClient.waitForTransactionReceipt({
            hash,
        });

        return {
            txHash: hash,
            receipt: receipt,
        };
    }
}

export default SmartContractsService;
