import { Aptos, AptosConfig, Network, Ed25519PrivateKey, Account } from "@aptos-labs/ts-sdk";
import chalk from "chalk";
import axios from "axios";

const REGISTRY_ADDR = "0xbd128d4f1dbb87783658bed4a4046f3811015952110f321863c34f161eb07611";

export class RelayerService {
    private client: Aptos;
    public account: Account;
    public orderHistory: any[] = [];

    constructor() {
        const config = new AptosConfig({
            network: Network.CUSTOM,
            fullnode: "https://testnet.movementnetwork.xyz/v1"
        });
        this.client = new Aptos(config);

        // Load Relayer Account from Env or Generate (for demo purposes)
        // In prod this would be process.env.RELAYER_PRIVATE_KEY
        if (process.env.RELAYER_PRIVATE_KEY) {
            const privateKey = new Ed25519PrivateKey(process.env.RELAYER_PRIVATE_KEY);
            this.account = Account.fromPrivateKey({ privateKey });
        } else {
            // For demo, generate a random one if not set
            this.account = Account.generate();
            console.log(chalk.yellow("⚠️  No RELAYER_PRIVATE_KEY set, using ephemeral account. Funding needed for execution!"));
        }

        console.log(chalk.blue(`🤖 Relayer Service Initialized: ${this.account.accountAddress.toString()}`));
        this.checkBalanceAndFund();
    }

    async submitOrder(intent: any, signatureStr: string, publicKeyStr: string, signingNonceStr: string) {
        console.log(chalk.yellow(`📝 Received Order Submission...`));
        try {
            await this.checkBalanceAndFund();

            const isSellFA = !intent.sell_token_type.includes("::");
            const isBuyFA = !intent.buy_token_type.includes("::");

            let funcName = "fill_order_v2"; // Default Coin-to-Coin
            let typeArguments: string[] = [intent.sell_token_type, intent.buy_token_type];

            // Base args common to all
            const baseArgs = [
                REGISTRY_ADDR,
                intent.maker,
                intent.nonce,
                this.hexToBytes(intent.sell_token),
                this.hexToBytes(intent.buy_token),
                intent.sell_amount,
                intent.start_buy_amount,
                intent.end_buy_amount,
                intent.start_time,
                intent.end_time,
                intent.buy_amount,
                this.hexToBytes(signatureStr),
                this.hexToBytes(publicKeyStr),
                this.hexToBytes(signingNonceStr)
            ];

            if (isSellFA && isBuyFA) {
                funcName = "fill_order_fa_to_fa";
                typeArguments = [];
                baseArgs.push(intent.sell_token_type); // sell_asset
                baseArgs.push(intent.buy_token_type); // buy_asset
            } else if (!isSellFA && isBuyFA) {
                funcName = "fill_order_coin_to_fa";
                typeArguments = [intent.sell_token_type];
                baseArgs.push(intent.buy_token_type); // buy_asset
            } else if (isSellFA && !isBuyFA) {
                funcName = "fill_order_fa_to_coin";
                typeArguments = [intent.buy_token_type]; // BuyCoin
                baseArgs.push(intent.sell_token_type); // sell_asset
            }

            console.log(`Calling ${funcName} with types:`, typeArguments);

            // 1. Construct Transaction
            const transaction = await this.client.transaction.build.simple({
                sender: this.account.accountAddress,
                data: {
                    function: `${REGISTRY_ADDR}::swap::${funcName}`,
                    typeArguments: typeArguments,
                    functionArguments: baseArgs
                },
                options: {
                    maxGasAmount: 200000, // Increase gas for FA ops?
                }
            });

            // 2. Check Initial Balance
            const startBalance = await this.getBalance();

            // 3. Sign and Submit
            console.log("🚀 Submitting Transaction...");
            const commitedTxn = await this.client.signAndSubmitTransaction({
                signer: this.account,
                transaction,
            });

            console.log(chalk.green(`✅ Transaction Submitted: ${commitedTxn.hash}`));

            // 4. Wait for Result
            const executedTxn = await this.client.waitForTransaction({ transactionHash: commitedTxn.hash });
            console.log(`🎉 Transaction Confirmed! Status: ${(executedTxn as any).success ? 'Success' : 'Failed'}`);

            // 5. Check Final Balance
            const endBalance = await this.getBalance();
            const diff = startBalance - endBalance;
            // console.log(chalk.magenta(`💰 Balance Change: ${startBalance} -> ${endBalance} (Cost: ${(diff / 100000000).toFixed(6)} MOVE)`));

            const result = {
                hash: commitedTxn.hash,
                success: (executedTxn as any).success,
                timestamp: Date.now(),
                intent: intent
            };
            this.orderHistory.unshift(result);
            if (this.orderHistory.length > 50) this.orderHistory.pop();

            return result;

        } catch (error: any) {
            console.error(chalk.red("❌ Error submitting order:"), error);
            this.orderHistory.unshift({
                hash: null,
                success: false,
                error: error.message || "Unknown error",
                timestamp: Date.now(),
                intent: intent
            });
            throw error;
        }
    }

    // Helper
    private hexToBytes(hex: string): Uint8Array {
        if (!hex) return new Uint8Array();
        hex = hex.replace(/^0x/, '');
        return new Uint8Array(Buffer.from(hex, 'hex'));
    }

    // Token Definitions
    private TOKENS = [
        { symbol: "MOVE", type: "0x1::aptos_coin::AptosCoin", decimals: 8 },
        { symbol: "WETH.e", type: "0x7eb1210794c2fdf636c5c9a5796b5122bf932458e3dd1737cf830d79954f5fdb", decimals: 8 },
        { symbol: "USDC.e", type: "0x45142fb00dde90b950183d8ac2815597892f665c254c3f42b5768bc6ae4c8489", decimals: 6 },
        { symbol: "USDT.e", type: "0x927595491037804b410c090a4c152c27af24d647863fc00b4a42904073d2d9de", decimals: 6 }
    ];

    // Get all token balances (public for /health endpoint)
    public async getAllBalances(): Promise<{ symbol: string; balance: number; decimals: number }[]> {
        const balances = [];
        for (const token of this.TOKENS) {
            const balance = await this.getBalance(token.type);
            balances.push({
                symbol: token.symbol,
                balance: balance,
                decimals: token.decimals
            });
        }
        return balances;
    }

    public async getBalance(tokenType: string = "0x1::aptos_coin::AptosCoin"): Promise<number> {
        try {
            const isStruct = tokenType.includes("::");

            if (isStruct) {
                const resources = await this.client.getAccountResources({ accountAddress: this.account.accountAddress });
                const coinStore = resources.find((r) => r.type === `0x1::coin::CoinStore<${tokenType}>`);
                return coinStore ? parseInt((coinStore.data as any).coin.value) : 0;
            } else {
                // FA Logic specific for Primary Store
                const balance = await this.client.view({
                    payload: {
                        function: "0x1::primary_fungible_store::balance",
                        typeArguments: ["0x1::fungible_asset::Metadata"], // generic T is Metadata
                        functionArguments: [this.account.accountAddress, tokenType] // owner, asset
                    }
                });
                return Number(balance[0]);
            }
        } catch (e) {
            // console.warn("⚠️  Could not fetch balance:", e);
            return 0;
        }
    }

    // Check Balance and Fund if needed
    private async checkBalanceAndFund() {
        console.log(chalk.cyan("💰 Checking Relayer Balances..."));

        for (const token of this.TOKENS) {
            try {
                const balance = await this.getBalance(token.type);
                const displayBalance = balance / Math.pow(10, token.decimals);
                console.log(chalk.cyan(`   - ${token.symbol}: ${displayBalance.toFixed(4)}`));

                // Auto-faucet only for MOVE (AptosCoin)
                if (token.symbol === "MOVE" && balance < 10000000) {
                    console.log(chalk.yellow("⚠️  MOVE Balance low! Requesting faucet funds..."));
                    await axios.post("https://faucet.testnet.movementnetwork.xyz/mint", null, {
                        params: {
                            amount: 100000000,
                            address: this.account.accountAddress.toString()
                        }
                    });
                    console.log(chalk.green("💸 Faucet request sent!"));
                    await new Promise(r => setTimeout(r, 2000));
                }
            } catch (e) {
                console.warn(`   - ${token.symbol}: Error fetching balance`);
            }
        }
    }
}

