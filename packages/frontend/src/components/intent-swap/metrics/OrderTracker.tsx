import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useSwap } from '@/context/SwapContext';
import { useWallet } from '@/context/wallet-provider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TOKENS } from '../forms/TokenSelector';
import { Loader2, ExternalLink, ArrowRight, RefreshCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

export function OrderTracker() {
    const { fetchOrderHistory, cancelOrder } = useSwap();
    const { connected } = useWallet();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Helper to find token info
    const getToken = (typeOrAddress: string) => {
        return TOKENS.find(t => t.type === typeOrAddress) || {
            symbol: "UNK",
            decimals: 8,
            icon: "",
            type: typeOrAddress
        };
    };

    const formatAmount = (amount: string) => {
        if (!amount) return "0.00";
        const val = parseFloat(amount);
        return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
    };

    const loadOrders = async () => {
        if (!connected) return;
        setLoading(true);
        try {
            const data = await fetchOrderHistory();
            setOrders(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
        // Refresh every 10s
        const interval = setInterval(loadOrders, 10000);
        return () => clearInterval(interval);
    }, [connected]);

    const handleCancel = async (order: any) => {
        if (!confirm("Are you sure you want to cancel this order?")) return;
        try {
            // Note: cancelOrder returns void, but we know it submits a tx. 
            // Ideally cancelOrder should return the hash.
            // For now, general success toast.
            await cancelOrder(order);
            toast.success("Order Cancelled", {
                description: "Your cancellation request has been processed."
            });
            loadOrders();
        } catch (e: any) {
            console.error("Cancel failed", e);
            toast.error("Cancellation Failed", {
                description: e.message || "Unknown error"
            });
        }
    };

    if (!connected) {
        return (
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Connect wallet to view your orders.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-[400px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold">Your Orders</CardTitle>
                <Button variant="ghost" size="icon" onClick={loadOrders} disabled={loading} className="h-8 w-8">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                </Button>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                    {orders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No recent orders found.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map((order, i) => {
                                const sToken = getToken(order.sell_token || order.sell_token_type); // Handle potential naming variations if any
                                const bToken = getToken(order.buy_token || order.buy_token_type);

                                return (
                                    <div key={i} className="bg-muted/40 rounded-lg p-3 border border-border/50 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(order.timestamp * 1000), { addSuffix: true })}
                                                </span>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Badge
                                                        variant={
                                                            order.status === 'FILLED' ? 'default' :
                                                                order.status === 'CANCELLED' ? 'secondary' :
                                                                    order.status === 'EXPIRED' ? 'destructive' : 'outline'
                                                        }
                                                        className={`text-[10px] px-1.5 py-0.5 h-auto ${order.status === 'FILLED' ? 'bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/20' :
                                                            order.status === 'CREATED' ? 'bg-blue-500/15 text-blue-500 hover:bg-blue-500/25 border-blue-500/20' : ''
                                                            }`}
                                                    >
                                                        {order.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                            {order.order_hash && (
                                                <a
                                                    href={`https://explorer.movementlabs.xyz/txn/${order.order_hash}?network=testnet`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                                    title="View Transaction"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between gap-2 text-sm">
                                            <div className="flex items-center gap-2 bg-background/50 p-1.5 rounded-md flex-1">
                                                {sToken.icon && <img src={sToken.icon} className="w-5 h-5 rounded-full" />}
                                                <span className="font-medium">{formatAmount(order.sell_amount)}</span>
                                            </div>
                                            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                            <div className="flex items-center gap-2 bg-background/50 p-1.5 rounded-md flex-1 justify-end">
                                                <span className="font-medium">{formatAmount(order.buy_amount)}</span>
                                                {bToken.icon && <img src={bToken.icon} className="w-5 h-5 rounded-full" />}
                                            </div>
                                        </div>

                                        {(order.status === 'CREATED') && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                onClick={() => handleCancel(order)}
                                                disabled={loading}
                                            >
                                                Cancel Order
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}