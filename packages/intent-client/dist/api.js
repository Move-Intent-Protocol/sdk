"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentAPI = void 0;
class IntentAPI {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async submitOrder(intent) {
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
    async getOrder(id) {
        const response = await fetch(`${this.baseUrl}/orders/${id}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch order: ${response.statusText}`);
        }
        return response.json();
    }
    async getOrders(params) {
        const searchParams = new URLSearchParams();
        if (params?.maker)
            searchParams.set('maker', params.maker);
        const response = await fetch(`${this.baseUrl}/orders?${searchParams}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch orders: ${response.statusText}`);
        }
        return response.json();
    }
}
exports.IntentAPI = IntentAPI;
