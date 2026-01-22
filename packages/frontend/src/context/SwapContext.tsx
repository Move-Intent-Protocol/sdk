import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { useWallet } from '@/context/wallet-provider'; // Use custom provider
import { signAndSubmitTransaction as adapterSignTransaction, signMessage as adapterSignMessage } from '@/lib/wallet/adapter';
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import axios from 'axios';
import { INTENT_SWAP_ADDRESS, RELAYER_URL } from '../lib/config';
import { DEFAULT_NETWORK } from '../lib/wallet/networks';
import { serializeIntent, hashIntent } from '../lib/bcs';
import { SwapParams } from '@/types';

interface SwapContextType {
    escrowBalance: Record<string, number>;
    refreshBalance: () => Promise<void>;
    depositToEscrow: (amount: number, tokenType: string, decimals?: number) => Promise<void>;
    withdrawFromEscrow: (amount: number, tokenType: string, decimals?: number) => Promise<void>;
    buildAndSubmitIntent: (params: SwapParams) => Promise<any>;
    fetchOrderHistory: () => Promise<any[]>;
    cancelOrder: (order: any) => Promise<void>;
    isLoading: boolean;
    relayerUrl: string;
}

const SwapContext = createContext<SwapContextType | undefined>(undefined);

export function SwapProvider({ children }: { children: ReactNode }) {
    const { account, wallet } = useWallet(); // Custom hook returns wallet object
    const [escrowBalance, setEscrowBalance] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Setup Aptos Client - Use Bardock Testnet
    const config = new AptosConfig({ network: Network.CUSTOM, fullnode: DEFAULT_NETWORK.url });
    const client = new Aptos(config);

    // Log connection info on mount
    useEffect(() => {
        console.log("=== SwapContext Initialized ===");
        console.log("Network URL:", DEFAULT_NETWORK.url);
        console.log("Network Name:", DEFAULT_NETWORK.buttonName);
        console.log("Chain ID:", DEFAULT_NETWORK.chainId);
        console.log("Intent Swap Contract:", INTENT_SWAP_ADDRESS);
        console.log("Relayer URL:", RELAYER_URL);
    }, []);

    const refreshBalance = async () => {
        if (!account) {
            setEscrowBalance({});
            return;
        }
        console.log("=== Fetching Escrow Balances ===");
        const newBalances: Record<string, number> = {};

        const { TOKENS } = await import('../components/intent-swap/forms/TokenSelector');

        for (const token of TOKENS) {
            try {
                if (!token.type) continue;

                const isFA = !token.type.includes("::");
                const func = isFA ? "get_fa_balance" : "get_balance";
                const typeArgs = isFA ? [] : [token.type];
                const funcArgs = isFA ? [account.address, token.type] : [account.address];

                const balanceVal = await client.view({
                    payload: {
                        function: `${INTENT_SWAP_ADDRESS}::escrow::${func}`,
                        typeArguments: typeArgs,
                        functionArguments: funcArgs
                    }
                });

                const factor = Math.pow(10, token.decimals);
                const bal = Number(balanceVal[0]) / factor;
                newBalances[token.type] = bal;
                console.log(`Balance for ${token.symbol}: ${bal}`);
            } catch (e) {
                newBalances[token.type] = 0;
            }
        }
        setEscrowBalance(newBalances);
    };

    useEffect(() => {
        refreshBalance();
        const interval = setInterval(refreshBalance, 5000);
        return () => clearInterval(interval);
    }, [account]);

    const depositToEscrow = async (amount: number, tokenType: string, decimals: number = 8) => {
        if (!account || !wallet) throw new Error("Wallet not connected");
        setIsLoading(true);

        const factor = Math.pow(10, decimals);
        const rawAmount = Math.floor(amount * factor);
        const isFA = !tokenType.includes("::");

        console.log("=== Depositing to Escrow ===");
        console.log("Amount:", amount, "(raw:", rawAmount, ")");
        console.log("Token Type:", tokenType, "Is FA:", isFA);

        try {
            const funcName = isFA ? "deposit_fa" : "deposit";
            const functionName = `${INTENT_SWAP_ADDRESS}::escrow::${funcName}`;

            const typeArguments = isFA ? [] : [tokenType];
            const functionArguments = isFA
                ? [INTENT_SWAP_ADDRESS, rawAmount, tokenType] // registry_addr, amount, asset
                : [rawAmount];

            const transactionData = {
                function: functionName,
                typeArguments,
                functionArguments
            };
            console.log("Transaction Data:", JSON.stringify(transactionData, null, 2));

            const response = await adapterSignTransaction(wallet, transactionData);
            console.log("Transaction Response:", JSON.stringify(response, null, 2));

            // Robust hash extraction
            let txHash = "";
            if (typeof response === 'string') {
                txHash = response;
            } else if (response.hash) {
                txHash = response.hash;
            } else if (response.transactionHash) {
                txHash = response.transactionHash;
            } else if (response.id) {
                txHash = response.id;
            } else if (response.args?.hash) {
                txHash = response.args.hash;
            }

            if (!txHash) {
                console.error("Failed to extract transaction hash from response:", response);
                throw new Error("Invalid transaction response from wallet");
            }

            console.log("Extracted Hash:", txHash);

            await client.waitForTransaction({ transactionHash: txHash });
            console.log("Transaction Confirmed!");
            await refreshBalance();
        } catch (e) {
            console.error("Deposit Error:", e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    const withdrawFromEscrow = async (amount: number, tokenType: string, decimals: number = 8) => {
        if (!account || !wallet) throw new Error("Wallet not connected");
        setIsLoading(true);

        const factor = Math.pow(10, decimals);
        const rawAmount = Math.floor(amount * factor);
        const isFA = !tokenType.includes("::");

        console.log("=== Withdrawing from Escrow ===");
        console.log("Amount:", amount, "(raw:", rawAmount, ")");
        console.log("Token Type:", tokenType, "Is FA:", isFA);

        try {
            const funcName = isFA ? "withdraw_fa" : "withdraw";
            const functionName = `${INTENT_SWAP_ADDRESS}::escrow::${funcName}`;

            const typeArguments = isFA ? [] : [tokenType];
            const functionArguments = isFA
                ? [INTENT_SWAP_ADDRESS, rawAmount, tokenType] // registry_addr, amount, asset
                : [rawAmount];

            const transactionData = {
                function: functionName,
                typeArguments,
                functionArguments
            };
            console.log("Transaction Data:", JSON.stringify(transactionData, null, 2));

            const response = await adapterSignTransaction(wallet, transactionData);
            console.log("Transaction Response:", JSON.stringify(response, null, 2));

            // Robust hash extraction
            let txHash = "";
            if (typeof response === 'string') {
                txHash = response;
            } else if (response.hash) {
                txHash = response.hash;
            } else if (response.transactionHash) {
                txHash = response.transactionHash;
            } else if (response.id) {
                txHash = response.id;
            } else if (response.args?.hash) {
                txHash = response.args.hash;
            }

            if (!txHash) {
                console.error("Failed to extract transaction hash from response:", response);
                throw new Error("Invalid transaction response from wallet");
            }

            console.log("Extracted Hash:", txHash);

            await client.waitForTransaction({ transactionHash: txHash });
            console.log("Withdrawal Confirmed!");
            await refreshBalance();
        } catch (e) {
            console.error("Withdraw Error:", e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    // ... (keep existing state)

    // Helper to persist orders
    const saveOrderLocally = (order: any) => {
        const saved = localStorage.getItem('intent_orders');
        let orders = saved ? JSON.parse(saved) : [];

        // Prevent duplicates: valid orders have unique hash and nonce, but we allow same nonce for different orders (until filled)
        // Only filter by exact hash match to prevent duplicate entries of the SAME order
        orders = orders.filter((o: any) => o.order_hash !== order.order_hash);

        orders.push(order);
        localStorage.setItem('intent_orders', JSON.stringify(orders));
    };

    const fetchOrderHistory = async () => {
        if (!account) return [];

        // 1. Load Local Storage (Backup)
        const saved = localStorage.getItem('intent_orders');
        let localOrders = saved ? JSON.parse(saved) : [];

        // 2. Fetch Relayer Data (Source of Truth)
        let relayerPending: any[] = [];
        let relayerHistory: any[] = [];

        try {
            const [pendingRes, historyRes] = await Promise.all([
                axios.get(`${RELAYER_URL}/orders`),
                axios.get(`${RELAYER_URL}/activity`)
            ]);

            if (pendingRes.data && pendingRes.data.orders) {
                relayerPending = pendingRes.data.orders;
            }
            if (historyRes.data && historyRes.data.orders) {
                relayerHistory = historyRes.data.orders;
            }
        } catch (e) {
            console.warn("Failed to fetch relayer data, falling back to local only", e);
        }

        // 3. Merge Strategy
        // Use order_hash as the unique key (now consistent across all sources)
        // Priority: History (Final) > Pending (Active) > Local (Backup)
        const orderMap = new Map<string, any>();

        // A. Populate from Local first
        localOrders.forEach((o: any) => {
            if (o.maker === account.address.toString()) {
                orderMap.set(o.order_hash, o);
            }
        });

        // Helper to convert Relayer Order to Frontend Order format
        const mapRelayerOrder = (rOrder: any, status: string) => {
            const intent = rOrder.intent;
            const isLimit = intent.start_buy_amount === undefined && intent.buy_amount !== undefined;

            // Debugging ID inconsistency
            // console.log("Mapping Relayer Order:", rOrder);

            // Relayer inconsistency:
            // Pending orders have 'id' (which is the hash)
            // History orders have 'hash'
            // Some might have 'orderHash'
            const hash = rOrder.hash || rOrder.id || rOrder.orderHash;


            return {
                order_hash: hash,
                maker: intent.maker,
                sell_token: intent.sell_token_type || "UNKNOWN", // Relayer uses _type, frontend expects simple sometimes? No, frontend uses what it sent.
                // We should try to preserve local "sell_token" (symbol) if possible, else derive.
                // For now, if we have a local entry, we keep its "sell_token" (symbol). If new from Relayer, we might have type.

                sell_amount: intent.sell_amount,
                buy_token: intent.buy_token_type || "UNKNOWN",
                buy_amount: isLimit ? intent.buy_amount : intent.end_buy_amount, // Approximate for market
                status: status,
                timestamp: rOrder.timestamp ? rOrder.timestamp / 1000 : Date.now() / 1000,
                nonce: intent.nonce,
                end_time: intent.expiry_time || intent.end_time,
                is_limit_order: isLimit,
                order_type: isLimit ? 'LIMIT' : 'MARKET'
            };
        };

        // B. Merge Pending Orders (Active)
        relayerPending.forEach((rOrder: any) => {
            if (rOrder.intent.maker === account.address.toString()) {
                const hash = rOrder.id; // Pending orders use 'id' which is now the frontend's intentHash
                const existing = orderMap.get(hash);
                if (existing) {
                    orderMap.set(hash, { ...existing, status: 'CREATED', order_type: existing.is_limit_order ? 'LIMIT' : 'MARKET' });
                } else {
                    orderMap.set(hash, mapRelayerOrder(rOrder, 'CREATED'));
                }
            }
        });

        // C. Merge History (Final)
        // Note: Relayer history uses tx hash (commitedTxn.hash) which differs from intent hash
        // We need to match by nonce to find the original local order and preserve its formatted amounts
        relayerHistory.forEach((rOrder: any) => {
            if (rOrder.intent.maker === account.address.toString()) {
                const txHash = rOrder.hash; // Transaction hash from blockchain
                const finalStatus = rOrder.success ? 'FILLED' : 'CANCELLED';

                // Try to find existing local order by nonce (more reliable match)
                let existingKey: string | null = null;
                let existingOrder: any = null;
                orderMap.forEach((order, key) => {
                    if (order.nonce == rOrder.intent.nonce && order.maker === rOrder.intent.maker) {
                        existingKey = key;
                        existingOrder = order;
                    }
                });

                if (existingOrder && existingKey) {
                    if (existingOrder.status !== finalStatus && finalStatus === 'FILLED') {
                        refreshBalance();
                    }
                    // Remove old entry and add with tx hash, preserving local formatted amounts
                    orderMap.delete(existingKey);
                    orderMap.set(txHash, {
                        ...existingOrder,
                        status: finalStatus,
                        order_hash: txHash,
                        order_type: existingOrder.is_limit_order ? 'LIMIT' : 'MARKET'
                    });
                } else {
                    // No local match found, use Relayer data (will have raw amounts)
                    orderMap.set(txHash, mapRelayerOrder(rOrder, finalStatus));
                }
            }
        });

        // 4. Convert to Array and Sort
        const mergedOrders = Array.from(orderMap.values())
            .sort((a: any, b: any) => b.timestamp - a.timestamp);

        // 5. Update Local Storage (Sync Backup)
        // We only save everything back to ensure local storage stays efficient
        // But we want to preserve other users' orders too if we filtered earlier? 
        // Ideally we just overwrite for this browser.

        // Save updated orders for this user + preserve other users' orders
        const otherUserOrders = localOrders.filter((o: any) => o.maker !== account.address.toString());
        const infoToSave = [...otherUserOrders, ...mergedOrders];
        localStorage.setItem('intent_orders', JSON.stringify(infoToSave));

        return mergedOrders;

    };

    const cancelOrder = async (_order: any) => {
        if (!account || !wallet) throw new Error("Wallet not connected");
        setIsLoading(true);
        try {
            // To cancel, we increment the nonce on-chain
            const transactionData = {
                function: `${INTENT_SWAP_ADDRESS}::swap::cancel_orders`,
                typeArguments: [],
                functionArguments: [INTENT_SWAP_ADDRESS]
            };
            const response = await adapterSignTransaction(wallet, transactionData);
            await client.waitForTransaction({ transactionHash: response.hash });

            // Update local status
            // We can rely on fetchOrderHistory to pick it up via nonce check
        } catch (e) {
            console.error("Cancel failed", e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    const buildAndSubmitIntent = async (params: SwapParams) => {
        if (!account || !wallet) throw new Error("Wallet not connected");
        setIsLoading(true);
        try {
            // 1. Build Intent Object
            const now = Math.floor(Date.now() / 1000);
            const duration = params.duration || 300; // Default 5 mins if not specified
            const isLimit = params.isLimitOrder === true;

            // Fetch nonce from chain - dependent on order type
            const moduleName = isLimit ? "limit_order" : "swap";
            const nonceVal = await client.view({
                payload: {
                    function: `${INTENT_SWAP_ADDRESS}::${moduleName}::get_nonce`,
                    functionArguments: [INTENT_SWAP_ADDRESS, account.address.toString()]
                }
            });
            const nonce = nonceVal && nonceVal[0] ? nonceVal[0].toString() : "0";
            console.log(`=== On-Chain Nonce Fetched (${isLimit ? 'Limit' : 'Market'}) ===`, nonce);

            // Calculate amounts using actual token decimals
            const sellMultiplier = Math.pow(10, params.sellDecimals);
            const buyMultiplier = Math.pow(10, params.buyDecimals);

            const sellAmountRaw = Math.floor(params.sellAmount * sellMultiplier);

            // Amount Logic
            let startBuyAmountRaw = 0;
            let endBuyAmountRaw = 0;
            let buyAmountRaw = 0;

            if (isLimit) {
                // FIXED Price - Exact amount user requested
                // No buffer, no decay. 
                buyAmountRaw = Math.floor(params.buyAmount * buyMultiplier);
            } else {
                // Dutch Auction
                startBuyAmountRaw = Math.floor(params.buyAmount * 1.05 * buyMultiplier); // 5% buffer start
                endBuyAmountRaw = Math.floor(params.buyAmount * buyMultiplier); // User requested min
            }

            // Normalize token types
            const canonicalizeType = (type: string): string => {
                if (type.includes("::")) return type;
                return "@" + type;
            };

            const sellTokenNormalized = canonicalizeType(params.sellToken);
            const buyTokenNormalized = canonicalizeType(params.buyToken);

            console.log(`Normalized Sell: ${params.sellToken} -> ${sellTokenNormalized}`);
            console.log(`Normalized Buy: ${params.buyToken} -> ${buyTokenNormalized}`);

            // Serialize for Hashing
            let serializedBytes: Uint8Array;

            if (isLimit) {
                const { serializeLimitIntent } = await import('../lib/bcs');
                serializedBytes = serializeLimitIntent(
                    account.address.toString(),
                    nonce,
                    sellTokenNormalized,
                    buyTokenNormalized,
                    sellAmountRaw,
                    buyAmountRaw,
                    now + duration // expiry_time
                );
            } else {
                serializedBytes = serializeIntent(
                    account.address.toString(),
                    nonce,
                    sellTokenNormalized,
                    buyTokenNormalized,
                    sellAmountRaw,
                    startBuyAmountRaw,
                    endBuyAmountRaw,
                    now,
                    now + duration
                );
            }

            const intentHash = hashIntent(serializedBytes);
            const intentHashHex = "0x" + intentHash;

            // 2. Sign the Hash
            const response = await adapterSignMessage(wallet, {
                message: intentHash,
                nonce: nonce
            });

            console.log("=== Wallet Sign Response ===", JSON.stringify(response, null, 2));

            // Extract signature with multiple fallback paths for different wallet implementations
            let signatureVal: any = null;

            // Path 1: Standard aptos:signMessage response format
            if (response.args?.signature) {
                signatureVal = response.args.signature;
            }
            // Path 2: Direct signature property
            else if (response.signature) {
                signatureVal = response.signature;
            }
            // Path 3: Nightly wallet may return signature in fullMessage
            else if ((response as any).fullMessage?.signature) {
                signatureVal = (response as any).fullMessage.signature;
            }
            // Path 4: Some wallets return the signature directly in args
            else if (response.args && typeof response.args === 'object') {
                // Check if args itself contains the signature bytes
                if (response.args.data || response.args instanceof Uint8Array) {
                    signatureVal = response.args;
                }
            }
            // Path 5: The entire response might be the signature object
            else if (response && typeof response === 'object' && !response.args) {
                // Last resort: try using the response directly if it looks like a signature
                if ((response as any).data || (response as any).bytes) {
                    signatureVal = response;
                }
            }

            console.log("=== Extracted signatureVal ===", signatureVal);

            if (!signatureVal) throw new Error("Failed to extract signature from wallet response");

            // Extract Hex String helper
            const toHex = (arr: Uint8Array) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');

            const getHexString = (val: any): string => {
                if (!val) return "";
                if (typeof val === 'string') return val;
                if (val.args) return getHexString(val.args);
                if (val.key) return getHexString(val.key);
                if (val instanceof Uint8Array) {
                    return "0x" + toHex(val);
                }
                if (val.data) return getHexString(val.data);
                if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).every(k => !isNaN(parseInt(k)))) {
                    return "0x" + Object.values(val).map((b: any) => parseInt(b).toString(16).padStart(2, '0')).join('');
                }
                if (Array.isArray(val)) {
                    return "0x" + val.map(b => parseInt(b as any).toString(16).padStart(2, '0')).join('');
                }
                if (val.signature) return getHexString(val.signature);
                return "";
            };

            const signatureStr = getHexString(signatureVal);
            if (!signatureStr) throw new Error("Invalid signature format");
            const publicKeyStr = getHexString(account.publicKey);

            // Extract signing nonce
            let signingNonceVal: any = nonce;
            if (response.args?.nonce !== undefined) signingNonceVal = response.args.nonce;
            else if ((response as any).nonce !== undefined) signingNonceVal = (response as any).nonce;

            const encoder = new TextEncoder();
            const signingNonceStrRaw = signingNonceVal.toString();
            const signingNonceHex = "0x" + toHex(encoder.encode(signingNonceStrRaw));

            // 3. Prepare JSON for Relayer
            const intentJson: any = {
                maker: account.address.toString(),
                nonce: nonce,
                sell_token_type: params.sellToken,
                buy_token_type: params.buyToken,
                sell_token: toHex(encoder.encode(sellTokenNormalized)),
                buy_token: toHex(encoder.encode(buyTokenNormalized)),
                sell_amount: sellAmountRaw.toString(),
                start_time: now.toString(),
                end_time: (now + duration).toString(),
            };

            if (isLimit) {
                intentJson.buy_amount = buyAmountRaw.toString();
                intentJson.expiry_time = (now + duration).toString(); // Add alias for clarity if needed, Relayer checks intent structure
            } else {
                intentJson.start_buy_amount = startBuyAmountRaw.toString();
                intentJson.end_buy_amount = endBuyAmountRaw.toString();
            }

            const payload = {
                intent: intentJson,
                signature: signatureStr,
                publicKey: publicKeyStr,
                signingNonce: signingNonceHex,
                intentHash: intentHashHex  // Send computed hash for consistency
            };

            console.log("=== Submitting to Relayer ===", isLimit ? "[LIMIT]" : "[MARKET]");
            console.log("Payload:", JSON.stringify(payload, null, 2));

            await axios.post(`${RELAYER_URL}/intents`, payload);

            // Save order locally for tracking
            saveOrderLocally({
                order_hash: intentHashHex,
                maker: account.address.toString(),
                sell_token: params.sellToken,
                buy_token: params.buyToken,
                sell_amount: params.sellAmount,
                buy_amount: params.buyAmount,
                status: 'CREATED',
                timestamp: now,
                nonce: nonce,
                end_time: now + duration,
                is_limit_order: isLimit // Track type
            });

        } catch (e) {
            console.error("Relay failed", e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SwapContext.Provider value={{ escrowBalance, refreshBalance, depositToEscrow, withdrawFromEscrow, buildAndSubmitIntent, fetchOrderHistory, cancelOrder, isLoading, relayerUrl: RELAYER_URL }}>
            {children}
        </SwapContext.Provider>
    );
}

export const useSwap = () => {
    const context = useContext(SwapContext);
    if (context === undefined) {
        throw new Error('useSwap must be used within a SwapProvider');
    }
    return context;
};