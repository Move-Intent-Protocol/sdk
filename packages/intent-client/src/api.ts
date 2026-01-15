import { SignedIntent, Order } from '@intent-protocol/common';

export class IntentAPI {
    constructor(private baseUrl: string) { }

    async submitOrder(intent: SignedIntent): Promise<{ id: string }> {
        const response = await fetch(`${this.baseUrl}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(intent),
        });

        if (!response.ok) {
            throw new Error(`Failed to submit order: ${response.statusText}`);
        }

        return response.json();
    }

    async getOrder(id: string): Promise<Order> {
        const response = await fetch(`${this.baseUrl}/orders/${id}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch order: ${response.statusText}`);
        }

        return response.json();
    }

    async getOrders(params?: { maker?: string }): Promise<Order[]> {
        const searchParams = new URLSearchParams();
        if (params?.maker) searchParams.set('maker', params.maker);

        const response = await fetch(`${this.baseUrl}/orders?${searchParams}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch orders: ${response.statusText}`);
        }

        return response.json();
    }
}
