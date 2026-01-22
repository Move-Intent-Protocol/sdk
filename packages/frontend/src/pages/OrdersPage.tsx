
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

    // Filters
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'HISTORY'>('ALL');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'MARKET' | 'LIMIT'>('ALL');

    useEffect(() => {
        if (connected) {
            loadOrders();
        }
    }, [connected]);

    const loadOrders = async () => {
        setIsLoading(true);
        try {
            const fetchedOrders = await fetchOrderHistory();
            // Sort by timestamp desc
            fetchedOrders.sort((a: Order, b: Order) => b.timestamp - a.timestamp);
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

    // Apply Filters
    const filteredOrders = orders.filter(order => {
        // Status Filter
        if (statusFilter === 'OPEN') {
            if (order.status !== 'CREATED') return false;
        } else if (statusFilter === 'HISTORY') {
            if (order.status === 'CREATED') return false;
        }

        // Type Filter
        if (typeFilter !== 'ALL') {
            if (order.order_type !== typeFilter) {
                // Handle legacy orders missing order_type (assume market)
                if (!order.order_type && typeFilter !== 'MARKET') return false;
            }
        }
        return true;
    });

    if (!connected) {
        return (
            <div className="container mx-auto py-20 text-center">
                <h1 className="text-2xl font-bold mb-4">Please connect your wallet to view orders</h1>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 max-w-5xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold">Order History</h1>
                <div className="flex gap-2">
                    <Link to="/swap">
                        <Button>New Swap</Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex bg-muted p-1 rounded-lg">
                    {['ALL', 'OPEN', 'HISTORY'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setStatusFilter(filter as any)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${statusFilter === filter
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                <div className="flex bg-muted p-1 rounded-lg">
                    {['ALL', 'MARKET', 'LIMIT'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setTypeFilter(filter as any)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${typeFilter === filter
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {filter === 'ALL' ? 'All Types' : filter}
                        </button>
                    ))}
                </div>
            </div>

            <OrderList
                orders={filteredOrders}
                isLoading={isLoading}
                onSelectOrder={setSelectedOrder}
                onCancelOrder={handleCancel}
                itemsPerPage={20}
            />

            <OrderDetails
                order={selectedOrder}
                open={!!selectedOrder}
                onOpenChange={(open) => !open && setSelectedOrder(null)}
            />
        </div>
    );
}