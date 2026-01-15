export interface Intent {
    maker: string;
    nonce: string; // u64 as string
    sellToken: string;
    buyToken: string;
    sellAmount: string; // u64 as string
    startBuyAmount: string; // u64 as string
    endBuyAmount: string; // u64 as string
    startTime: string; // u64 as string
    endTime: string; // u64 as string
}

export interface SignedIntent extends Intent {
    signature: string; // Hex encoded signature
}

export type OrderStatus = 'open' | 'filled' | 'expired' | 'cancelled';

export interface Order {
    id: string;
    maker: string;
    intent: Intent;
    signature: string;
    status: OrderStatus;
    createdAt: number;
    fillTxHash?: string;
    filledAt?: number;
}
