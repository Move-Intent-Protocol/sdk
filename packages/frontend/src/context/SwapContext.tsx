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
            console.log("Transaction Response:", response);

            await client.waitForTransaction({ transactionHash: response.hash });
            console.log("Transaction Confirmed!");
            await refreshBalance();
        } catch (e) {
            console.error("Deposit Error:", e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    // ... (keep existing state)

    // Helper to persist orders
    const saveOrderLocally = (order: any) => {
        const saved = localStorage.getItem('intent_orders');
        const orders = saved ? JSON.parse(saved) : [];
        orders.push(order);
        localStorage.setItem('intent_orders', JSON.stringify(orders));
    };

    const fetchOrderHistory = async () => {
        if (!account) return [];
        const saved = localStorage.getItem('intent_orders');
        if (!saved) return [];

        let localOrders = JSON.parse(saved);
        // Filter for current account
        localOrders = localOrders.filter((o: any) => o.maker === account.address.toString());

        // Fetch Relayer Activity to cross-reference
        let relayerActivity: any[] = [];
        try {
            const res = await axios.get(`${RELAYER_URL}/activity`);
            if (res.data && res.data.orders) {
                relayerActivity = res.data.orders;
            }
        } catch (e) {
            console.warn("Failed to fetch relayer activity for status check", e);
        }

        // Create a map of Nonce -> RelayerOrder for the current user
        // We match by Nonce because it's robust even if hash calculation differs
        const relayerMap = new Map<string, any>();
        relayerActivity.forEach((rOrder: any) => {
            // Check if this relayer order belongs to current user
            if (rOrder.intent.maker === account.address.toString()) {
                relayerMap.set(rOrder.intent.nonce.toString(), rOrder);
            }
        });

        // Update statuses
        const updatedOrders = await Promise.all(localOrders.map(async (order: any) => {
            try {
                // 0. Check consistency with Relayer first (Trust Relayer for recent success)
                const matchedRelayerOrder = relayerMap.get(order.nonce.toString());

                if (matchedRelayerOrder) {
                    if (matchedRelayerOrder.success) {
                        if (order.status !== 'FILLED') {
                            refreshBalance(); // Update balance if status changing
                        }
                        // Update local hash to match Relayer (if different) to prevent future issues
                        const finalHash = matchedRelayerOrder.hash || order.order_hash;
                        return { ...order, status: 'FILLED', order_hash: finalHash };
                    }
                }

                if (order.status === 'FILLED' || order.status === 'CANCELLED') return order;

                // 1. Check is_order_filled on-chain
                const isFilledVal = await client.view({
                    payload: {
                        function: `${INTENT_SWAP_ADDRESS}::swap::is_order_filled`,
                        functionArguments: [INTENT_SWAP_ADDRESS, order.order_hash]
                    }
                });

                if (isFilledVal[0]) {
                    if (order.status !== 'FILLED') {
                        refreshBalance();
                        toast.success("Order Filled!", {
                            description: `Your order for ${order.buy_amount} ${order.buy_token} has been filled.`,
                            action: {
                                label: "View on Explorer",
                                onClick: () => window.open(`https://explorer.movementlabs.xyz/txn/${order.order_hash}?network=testnet`, '_blank')
                            }
                        });
                    }
                    return { ...order, status: 'FILLED' };
                }

                // 2. Check nonce for cancellation
                const nonceVal = await client.view({
                    payload: {
                        function: `${INTENT_SWAP_ADDRESS}::swap::get_nonce`,
                        functionArguments: [INTENT_SWAP_ADDRESS, order.maker]
                    }
                });
                const currentNonce = Number(nonceVal[0]);

                console.log(`Checking Order: ${order.order_hash} | Order Nonce: ${order.nonce} | Current Chain Nonce: ${currentNonce}`);

                if (order.nonce && Number(order.nonce) < currentNonce) {
                    // Only mark failed if Relayer explicitly says failed, OR if we are very old.
                    // If matchedRelayerOrder exists and !success => It failed/reverted.
                    if (matchedRelayerOrder && !matchedRelayerOrder.success) {
                        return { ...order, status: 'FAILED' };
                    }

                    // If NOT in relayer activity, we assume Cancelled/Replaced (legacy logic)
                    // But to be safer against hash mismatch on recently filled orders that haven't indexed yet,
                    // we could hesitate. But user complaint is about PERSISTENT mismatch.
                    // If Relayer has it as success, we handled it above.
                    // If Relayer doesn't have it, and nonce passed... it's likely cancelled.
                    console.log(`-> Marking as CANCELLED (Nonce ${order.nonce} < ${currentNonce})`);
                    return { ...order, status: 'CANCELLED' };
                }

                // 3. Check expiration
                const now = Date.now() / 1000;
                if (order.end_time && now > order.end_time) {
                    return { ...order, status: 'EXPIRED' };
                }

                return order;
            } catch (e) {
                console.warn("Failed to check status for", order.order_hash, e);
                return order;
            }
        }));

        // Save updated statuses back to local storage
        // We need to merge updatedOrders with the original list (which might contain other accounts' orders)
        const currentSaved = localStorage.getItem('intent_orders');
        const allOrders = currentSaved ? JSON.parse(currentSaved) : [];

        // Create a map of updated orders for easy lookup
        // Key by nonce + maker to be robust
        const updatedMap = new Map(updatedOrders.map((o: any) => [o.nonce.toString() + o.maker, o]));

        // Merge: Use updated version if exists, else keep original
        const mergedOrders = allOrders.map((existing: any) => {
            const key = existing.nonce.toString() + existing.maker;
            if (updatedMap.has(key)) {
                return updatedMap.get(key);
            }
            return existing;
        });

        localStorage.setItem('intent_orders', JSON.stringify(mergedOrders));

        return updatedOrders.sort((a: any, b: any) => b.timestamp - a.timestamp);
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
            const duration = 300; // 5 mins
            // Fetch nonce from chain
            const nonceVal = await client.view({
                payload: {
                    function: `${INTENT_SWAP_ADDRESS}::swap::get_nonce`,
                    functionArguments: [INTENT_SWAP_ADDRESS, account.address.toString()]
                }
            });
            const nonce = nonceVal && nonceVal[0] ? nonceVal[0].toString() : "0";
            console.log("=== On-Chain Nonce Fetched ===", nonce);

            // Calculate amounts using actual token decimals
            const sellMultiplier = Math.pow(10, params.sellDecimals);
            const buyMultiplier = Math.pow(10, params.buyDecimals);
            const sellAmountRaw = Math.floor(params.sellAmount * sellMultiplier);
            const startBuyAmountRaw = Math.floor(params.buyAmount * 1.05 * buyMultiplier); // 5% buffer start
            const endBuyAmountRaw = Math.floor(params.buyAmount * buyMultiplier); // User requested min


            // Normalize token types to match Move's type_name/string_utils::to_string output
            // IMPORTANT: Move uses SHORT addresses (0x1, not 0x00...01)
            // - type_info::type_name returns "0x1::aptos_coin::AptosCoin" (short)
            // - string_utils::to_string(&@0x...) returns "@0x..." (short, with @ prefix)
            const canonicalizeType = (type: string): string => {
                // For Coin types (contain "::"), keep as-is - Move uses short format
                if (type.includes("::")) {
                    return type;
                }
                // For FA types (pure address), prepend @ but keep short address format
                // Move's string_utils::to_string outputs "@0x..." for addresses
                return "@" + type;
            };

            const sellTokenNormalized = canonicalizeType(params.sellToken);
            const buyTokenNormalized = canonicalizeType(params.buyToken);

            console.log(`Normalized Sell: ${params.sellToken} -> ${sellTokenNormalized}`);
            console.log(`Normalized Buy: ${params.buyToken} -> ${buyTokenNormalized}`);

            // Serialize for Hashing
            const serializedBytes = serializeIntent(
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

            const intentHash = hashIntent(serializedBytes);
            // Convert hash to hex string for storage
            // hashIntent returns hex string from js-sha3
            const intentHashHex = "0x" + intentHash;

            // 2. Sign the Hash
            // Note: Use signMessage. The wallet will prepend prefix. 
            // If the verified check fails on chain, we know it's the prefix issue.
            // For now, this is the standard flow.
            const response = await adapterSignMessage(wallet, {
                message: intentHash,
                nonce: nonce
            });

            console.log("=== Wallet Sign Response ===", response);
            console.log("=== Response Args (Full) ===", JSON.stringify(response.args, null, 2));

            // Verify locally to debug
            try {
                // Log types first
                console.log("response.signature:", response.signature);
                console.log("response.args:", response.args);
                if (response.args) {
                    console.log("response.args.signature:", response.args.signature);
                    console.log("response.args.fullMessage:", response.args.fullMessage);
                    console.log("response.args.nonce:", response.args.nonce);
                }
            } catch (e) {
                console.warn("Local verification error:", e);
            }

            // 3. Prepare JSON for Relayer
            const encoder = new TextEncoder();
            const toHex = (arr: Uint8Array) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');

            const intentJson = {
                maker: account.address.toString(),
                nonce: nonce,
                sell_token_type: params.sellToken,
                buy_token_type: params.buyToken,
                sell_token: toHex(encoder.encode(sellTokenNormalized)),
                buy_token: toHex(encoder.encode(buyTokenNormalized)),
                sell_amount: sellAmountRaw.toString(),
                start_buy_amount: startBuyAmountRaw.toString(),
                end_buy_amount: endBuyAmountRaw.toString(),
                start_time: now.toString(),
                end_time: (now + duration).toString(),
                buy_amount: startBuyAmountRaw.toString() // Use start_buy_amount to ensure sufficient fill at auction start
            };

            // Helper to ensure hex string
            const getHexString = (val: any): string => {
                if (!val) return "";
                if (typeof val === 'string') return val;

                // Handle nested args (common in wallet-standard responses)
                if (val.args) return getHexString(val.args);
                if (val.key) return getHexString(val.key);

                // Handle byte arrays
                if (val instanceof Uint8Array) {
                    return "0x" + Array.from(val).map(b => b.toString(16).padStart(2, '0')).join('');
                }

                // Handle object with 'data' property (aptos-labs/ts-sdk / Nightly often uses this)
                // Recursively check data
                if (val.data) {
                    return getHexString(val.data);
                }

                // Handle Array-like object {0: x, 1: y}
                if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).every(k => !isNaN(parseInt(k)))) {
                    return "0x" + Object.values(val).map((b: any) => parseInt(b).toString(16).padStart(2, '0')).join('');
                }

                if (Array.isArray(val)) {
                    return "0x" + val.map(b => parseInt(b as any).toString(16).padStart(2, '0')).join('');
                }

                // Fallback: try to see if it has signature prop if we haven't checked already (though we check args above)
                if (val.signature) return getHexString(val.signature);

                return "";
            };

            // Verify response status if available (e.g. standard wallet adapter)
            if ((response as any).status === 'Rejected' || (response as any).status === 'UserRejectedRequest') {
                console.warn("User rejected signature request");
                throw new Error("Signature rejected by user");
            }

            // Extract signature from response - try multiple paths
            let signatureVal: any = null;
            if (response.args?.signature) {
                signatureVal = response.args.signature;
            } else if (response.signature) {
                signatureVal = response.signature;
            } else if (response.args) {
                // Nightly might embed signature directly in args
                signatureVal = response.args;
            }
            console.log("Extracted signatureVal:", signatureVal);

            if (!signatureVal) {
                console.error("No signature found in response:", response);
                throw new Error("Failed to extract signature from wallet response");
            }

            const signatureStr = getHexString(signatureVal);
            if (!signatureStr) {
                console.error("Failed to parse signature string from value:", signatureVal);
                throw new Error("Invalid signature format");
            }

            const publicKeyStr = getHexString(account.publicKey);

            console.log("Final signatureStr:", signatureStr);
            console.log("Final publicKeyStr:", publicKeyStr);

            // Extract signing nonce - Nightly uses 'nonce' in args
            let signingNonceVal: any = nonce; // Default to intent nonce
            if (response.args?.nonce !== undefined) {
                signingNonceVal = response.args.nonce;
                console.log("Using response.args.nonce:", signingNonceVal);
            } else if ((response as any).nonce !== undefined) {
                signingNonceVal = (response as any).nonce;
                console.log("Using response.nonce:", signingNonceVal);
            } else {
                console.log("Using default intent nonce:", signingNonceVal);
            }

            // Convert nonce to hex string of its ASCII representation
            // AIP-62 nonce is treated as a string in the message construction
            const signingNonceStrRaw = signingNonceVal.toString();
            const signingNonceHex = "0x" + toHex(encoder.encode(signingNonceStrRaw));

            const payload = {
                intent: intentJson,
                signature: signatureStr,
                publicKey: publicKeyStr,
                signingNonce: signingNonceHex
            };

            console.log("=== Submitting to Relayer ===");
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
                end_time: now + duration
            });

        } catch (e) {
            console.error("Relay failed", e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SwapContext.Provider value={{ escrowBalance, refreshBalance, depositToEscrow, buildAndSubmitIntent, fetchOrderHistory, cancelOrder, isLoading, relayerUrl: RELAYER_URL }}>
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