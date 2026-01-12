
import { useState, useEffect } from 'react';
import { useWallet } from '@/context/wallet-provider';
import { OrderList, Order } from '../components/intent-swap/OrderList';
import { OrderDetails } from '../components/intent-swap/OrderDetails';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useSwap } from '../context/SwapContext'; // Custom hook

export default function OrdersPage() {
    const { connected } = useWallet();
    const { fetchOrderHistory, cancelOrder } = useSwap();

    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (connected) {
            loadOrders();
        }
    }, [connected]);

    const loadOrders = async () => {
        setIsLoading(true);
        try {
            const fetchedOrders = await fetchOrderHistory();
            setOrders(fetchedOrders);
        } catch (e) {
            console.error("Failed to load orders", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = async (order: Order) => {
        if (confirm('Are you sure you want to cancel this order?')) {
            try {
                await cancelOrder(order);
                await loadOrders(); // Refresh
            } catch (e) {
                console.error("Cancel failed", e);
                alert('Failed to cancel order');
            }
        }
    };

    if (!connected) {
        return (
            <div className="container mx-auto py-20 text-center">
                <h1 className="text-2xl font-bold mb-4">Please connect your wallet to view orders</h1>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 max-w-4xl">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Order History</h1>
                <Link to="/swap">
                    <Button>New Swap</Button>
                </Link>
            </div>

            <OrderList
                orders={orders}
                isLoading={isLoading}
                onSelectOrder={setSelectedOrder}
                onCancelOrder={handleCancel}
            />

            <OrderDetails
                order={selectedOrder}
                open={!!selectedOrder}
                onOpenChange={(open) => !open && setSelectedOrder(null)}
            />
        </div>
    );
}