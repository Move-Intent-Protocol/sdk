import { Order, OrderStatus } from '@intent-protocol/common';

export interface OrderFilter {
    sellToken?: string;
    buyToken?: string;
    maker?: string;
    status?: OrderStatus;
}

export class ResolverAPI {
    constructor(private baseUrl: string) { }

    async getOpenOrders(filter?: OrderFilter): Promise<Order[]> {
        const searchParams = new URLSearchParams();
        if (filter?.sellToken) searchParams.set('sellToken', filter.sellToken);
        if (filter?.buyToken) searchParams.set('buyToken', filter.buyToken);
        if (filter?.maker) searchParams.set('maker', filter.maker);
        if (filter?.status) searchParams.set('status', filter.status);
        else searchParams.set('status', 'open'); // Default to open

        const response = await fetch(`${this.baseUrl}/orders?${searchParams}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch orders: ${response.statusText}`);
        }

        return response.json();
    }

    async updateOrderStatus(id: string, status: OrderStatus, txHash?: string): Promise<void> {
        const body: any = { status };
        if (txHash) body.fillTxHash = txHash;

        const response = await fetch(`${this.baseUrl}/orders/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`Failed to update order: ${response.statusText}`);
        }
    }
}
