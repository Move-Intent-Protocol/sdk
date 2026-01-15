import { SignedIntent, Order } from '@intent-protocol/common';
export declare class IntentAPI {
    private baseUrl;
    constructor(baseUrl: string);
    submitOrder(intent: SignedIntent): Promise<{
        id: string;
    }>;
    getOrder(id: string): Promise<Order>;
    getOrders(params?: {
        maker?: string;
    }): Promise<Order[]>;
}
