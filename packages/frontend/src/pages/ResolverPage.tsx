import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSwap } from '@/context/SwapContext';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import { TOKENS } from '@/components/intent-swap/forms/TokenSelector';
import { ArrowRight, ExternalLink } from 'lucide-react';

export function ResolverPage() {
    const { relayerUrl } = useSwap();
    const [orders, setOrders] = useState<any[]>([]);
    const [health, setHealth] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchActivity = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${relayerUrl}/activity`);
            if (res.data && res.data.orders) {
                setOrders(res.data.orders);
                setError(null);
            }
        } catch (e: any) {
            console.error("Failed to fetch activity", e);
            setError(e.message || "Failed to fetch activity");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHealth = async () => {
        try {
            const res = await axios.get(`${relayerUrl}/health`);
            setHealth(res.data);
        } catch (e) {
            console.warn("Failed to fetch health", e);
            setHealth(null);
        }
    };

    useEffect(() => {
        fetchActivity();
        fetchHealth();
        const interval = setInterval(() => {
            fetchActivity();
            fetchHealth();
        }, 5000);
        return () => clearInterval(interval);
    }, [relayerUrl]);

    // Helper to find token info
    const getToken = (typeOrAddress: string) => {
        return TOKENS.find(t => t.type === typeOrAddress) || {
            symbol: "UNKNOWN",
            decimals: 8,
            icon: "",
            type: typeOrAddress
        };
    };

    const formatAmount = (amount: string, token: any) => {
        if (!amount) return "0.00";
        const val = parseFloat(amount) / Math.pow(10, token.decimals);
        return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                    Relayer Activity
                </h1>
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex gap-2 items-center bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-800">
                        <div className={`w-3 h-3 rounded-full ${health ? 'bg-green-500' : 'bg-red-500'} ${health && 'animate-pulse'}`} />
                        <span className="text-sm font-mono">{health ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>
                    {health?.balances && health.balances.map((b: any) => (
                        <div key={b.symbol} className="bg-zinc-900/60 px-3 py-1.5 rounded-full border border-zinc-800">
                            <span className="text-xs text-muted-foreground font-medium">
                                {(b.balance / Math.pow(10, b.decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })} {b.symbol}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <Card className="border-0 bg-zinc-900/40 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Recent Swaps</span>
                        <Badge variant={isLoading ? "outline" : "secondary"} className="text-xs">
                            {isLoading ? "Refreshing..." : "Live Feed"}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {error && orders.length === 0 ? (
                        <div className="text-red-500 text-center py-8">Error: {error}</div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">No recent activity detected.</div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-zinc-800">
                                            <TableHead className="w-[180px]">Time</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Trade</TableHead>
                                            <TableHead className="text-right">Transaction</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.map((order: any, i) => {
                                            const sellToken = getToken(order.intent.sell_token_type);
                                            const buyToken = getToken(order.intent.buy_token_type);
                                            return (
                                                <TableRow key={i} className="border-zinc-800/50 hover:bg-white/5">
                                                    <TableCell className="font-mono text-zinc-400">
                                                        {formatDistanceToNow(order.timestamp, { addSuffix: true })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={order.success ? "default" : "destructive"} className={order.success ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : ""}>
                                                            {order.success ? "Success" : "Failed"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center gap-2">
                                                                {sellToken.icon && <img src={sellToken.icon} className="w-6 h-6 rounded-full" />}
                                                                <span className="font-medium">{formatAmount(order.intent.sell_amount, sellToken)} {sellToken.symbol}</span>
                                                            </div>
                                                            <ArrowRight className="w-4 h-4 text-zinc-600" />
                                                            <div className="flex items-center gap-2">
                                                                {buyToken.icon && <img src={buyToken.icon} className="w-6 h-6 rounded-full" />}
                                                                <span className="font-medium">{formatAmount(order.intent.buy_amount, buyToken)} {buyToken.symbol}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {order.hash ? (
                                                            <a href={`https://explorer.movementlabs.xyz/txn/${order.hash}?network=testnet`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                                                                <span className="font-mono">{order.hash.slice(0, 8)}...</span>
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        ) : <span className="text-zinc-600">-</span>}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {orders.map((order: any, i) => {
                                    const sellToken = getToken(order.intent.sell_token_type);
                                    const buyToken = getToken(order.intent.buy_token_type);
                                    return (
                                        <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-zinc-500 font-mono">
                                                    {formatDistanceToNow(order.timestamp, { addSuffix: true })}
                                                </span>
                                                <Badge variant={order.success ? "default" : "destructive"} className={order.success ? "bg-green-500/10 text-green-500" : ""}>
                                                    {order.success ? "Success" : "Failed"}
                                                </Badge>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center p-2 bg-black/20 rounded-lg">
                                                    <span className="text-sm text-zinc-400">From</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{formatAmount(order.intent.sell_amount, sellToken)} {sellToken.symbol}</span>
                                                        {sellToken.icon && <img src={sellToken.icon} className="w-5 h-5 rounded-full" />}
                                                    </div>
                                                </div>
                                                <div className="flex justify-center -my-3 relative z-10">
                                                    <div className="bg-zinc-800 p-1 rounded-full text-zinc-400">
                                                        <ArrowRight className="w-3 h-3 rotate-90" />
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center p-2 bg-black/20 rounded-lg">
                                                    <span className="text-sm text-zinc-400">To</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{formatAmount(order.intent.buy_amount, buyToken)} {buyToken.symbol}</span>
                                                        {buyToken.icon && <img src={buyToken.icon} className="w-5 h-5 rounded-full" />}
                                                    </div>
                                                </div>
                                            </div>

                                            {order.hash && (
                                                <div className="pt-2 border-t border-zinc-800 flex justify-end">
                                                    <a href={`https://explorer.movementlabs.xyz/txn/${order.hash}?network=testnet`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-xs text-blue-400">
                                                        View Transaction <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
