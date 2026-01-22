// Token Types
export interface Token {
    symbol: string;
    name: string;
    icon: string;
    decimals: number;
    type: string;
}

// Oracle Types
export interface PriceData {
    id: string;
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
}

// Swap Types
export interface SwapParams {
    sellToken: string; // e.g. "0x1::aptos_coin::AptosCoin"
    buyToken: string;
    sellAmount: number;
    buyAmount: number; // Minimum receive
    slippage: number; // %
    sellDecimals: number; // Token decimals for sell token
    buyDecimals: number; // Token decimals for buy token
    duration?: number; // Optional duration in seconds
    isLimitOrder?: boolean; // If true, treat as fixed price limit order
}
