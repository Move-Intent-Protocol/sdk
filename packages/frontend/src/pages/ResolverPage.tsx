import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSwap } from '@/context/SwapContext';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import { TOKENS } from '@/components/intent-swap/forms/TokenSelector';
import { ArrowRight, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

export function ResolverPage() {
    const { relayerUrl } = useSwap();
    const [orders, setOrders] = useState<any[]>([]); // History
    const [limitOrders, setLimitOrders] = useState<any[]>([]); // Open Limit Orders
    const [health, setHealth] = useState<any>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [view, setView] = useState<'LIMIT' | 'HISTORY'>('LIMIT');
    const itemsPerPage = 20;

    const fetchActivity = async () => {
        setIsLoading(true);
        try {
            // Fetch History
            const resActivity = await axios.get(`${relayerUrl}/activity`);
            if (resActivity.data && resActivity.data.orders) {
                // Filter to only show successful fills in Recent Swaps
                const successfulOrders = resActivity.data.orders.filter((o: any) => o.success);
                setOrders(successfulOrders);
            }

            // Fetch Open Limit Orders
            const resOpen = await axios.get(`${relayerUrl}/orders`);
            if (resOpen.data && resOpen.data.orders) {
                setLimitOrders(resOpen.data.orders);
            }
            setError(null);
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

    // Pagination Logic
    const totalPages = Math.ceil(orders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = orders.slice(startIndex, startIndex + itemsPerPage);

    const handlePrevious = () => setCurrentPage(p => Math.max(1, p - 1));
    const handleNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                    Relayer Activity
                </h1>
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex gap-2 items-center bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-800">
                        {health === undefined ? (
                            <>
                                <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
                                <span className="text-sm font-mono text-yellow-500">CONNECTING</span>
                            </>
                        ) : health ? (
                            <>
                                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-sm font-mono text-green-500">ONLINE</span>
                            </>
                        ) : (
                            <>
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <span className="text-sm font-mono text-red-500">OFFLINE</span>
                            </>
                        )}
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

            {/* View Toggles */}
            <div className="flex items-center gap-2 p-1 bg-zinc-900/50 rounded-lg w-fit border border-zinc-800/50">
                <Button
                    variant={view === 'LIMIT' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setView('LIMIT')}
                    className="gap-2"
                >
                    Open Limit Orders
                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 ml-1 h-5 px-1.5 min-w-[1.25rem]">
                        {limitOrders.length}
                    </Badge>
                </Button>
                <Button
                    variant={view === 'HISTORY' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setView('HISTORY')}
                >
                    Recent Swaps
                </Button>
            </div>

            {/* LIMIT ORDERS SECTION */}
            {view === 'LIMIT' && (
                <Card className="border-0 bg-zinc-900/40 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span>Open Limit Orders</span>
                                <Badge variant="outline" className="text-yellow-500 border-yellow-500/20 bg-yellow-500/10">
                                    {limitOrders.length} Active
                                </Badge>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {limitOrders.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No open limit orders.</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-zinc-800">
                                        <TableHead>Created</TableHead>
                                        <TableHead>Expiry</TableHead>
                                        <TableHead>Trade</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {limitOrders.map((order: any, i) => {
                                        const sellToken = getToken(order.intent.sell_token_type);
                                        const buyToken = getToken(order.intent.buy_token_type);
                                        // Calculate expiry relative
                                        const expiry = new Date(order.intent.end_time * 1000);
                                        const created = new Date(order.createdAt);
                                        const isExpired = Date.now() > expiry.getTime();

                                        return (
                                            <TableRow key={i} className="border-zinc-800/50 hover:bg-white/5">
                                                <TableCell className="font-mono text-zinc-400">
                                                    {formatDistanceToNow(created, { addSuffix: true })}
                                                </TableCell>
                                                <TableCell className="font-mono text-zinc-400">
                                                    {isExpired ? <span className="text-red-500">Expired</span> : formatDistanceToNow(expiry, { addSuffix: true })}
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
                                                            <span className="font-medium">{formatAmount(order.intent.buy_amount || order.intent.start_buy_amount, buyToken)} {buyToken.symbol}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-mono text-zinc-300">
                                                        {(() => {
                                                            const sVal = parseFloat(order.intent.sell_amount) / Math.pow(10, sellToken.decimals);
                                                            // Use buy_amount for limit orders, start_buy_amount for market orders
                                                            const buyAmount = order.intent.buy_amount || order.intent.start_buy_amount;
                                                            const bVal = parseFloat(buyAmount) / Math.pow(10, buyToken.decimals);
                                                            if (!sVal || !bVal) return '-';

                                                            // Heuristic for Price Label
                                                            const isSellStable = sellToken.symbol.includes("USDC") || sellToken.symbol.includes("USDT");
                                                            const isBuyStable = buyToken.symbol.includes("USDC") || buyToken.symbol.includes("USDT");

                                                            if (isBuyStable && !isSellStable) return `${(bVal / sVal).toFixed(4)} ${buyToken.symbol}/${sellToken.symbol}`;
                                                            if (isSellStable && !isBuyStable) return `${(sVal / bVal).toFixed(4)} ${sellToken.symbol}/${buyToken.symbol}`;
                                                            return `${(bVal / sVal).toFixed(4)} ${buyToken.symbol}/${sellToken.symbol}`;
                                                        })()}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-blue-400 border-blue-400/20 bg-blue-400/10 animate-pulse">
                                                        PENDING MATCH
                                                    </Badge>
                                                    {/* <span className="text-xs text-zinc-500 ml-2">ID: {order.id.slice(0,6)}...</span> */}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}

            {view === 'HISTORY' && (
                <Card className="border-0 bg-zinc-900/40 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                                                <TableHead>Price</TableHead>
                                                <TableHead>Trade</TableHead>
                                                <TableHead className="text-right">Transaction</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedOrders.map((order: any, i) => {
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
                                                            <span className="font-mono text-zinc-300 text-sm">
                                                                {order.executionRateLabel || (() => {
                                                                    // Fallback calculation for old orders (implicit rate)
                                                                    const sVal = parseFloat(order.intent.sell_amount) / Math.pow(10, sellToken.decimals);
                                                                    const bVal = parseFloat(order.intent.buy_amount) / Math.pow(10, buyToken.decimals);
                                                                    if (!sVal || !bVal) return '-';

                                                                    const isSellStable = sellToken.symbol.includes("USDC") || sellToken.symbol.includes("USDT");
                                                                    const isBuyStable = buyToken.symbol.includes("USDC") || buyToken.symbol.includes("USDT");

                                                                    if (isBuyStable && !isSellStable) return `${(bVal / sVal).toFixed(4)}`;
                                                                    if (isSellStable && !isBuyStable) return `${(sVal / bVal).toFixed(4)}`;
                                                                    return `${(bVal / sVal).toFixed(4)}`;
                                                                })()}
                                                            </span>
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
                                    {paginatedOrders.map((order: any, i) => {
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

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
                                        <div className="text-sm text-muted-foreground">
                                            Page {currentPage} of {totalPages}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handlePrevious}
                                                disabled={currentPage === 1}
                                                className="h-9 px-3"
                                            >
                                                <ChevronLeft className="h-4 w-4 mr-2" />
                                                Previous
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleNext}
                                                disabled={currentPage === totalPages}
                                                className="h-9 px-3"
                                            >
                                                Next
                                                <ChevronRight className="h-4 w-4 ml-2" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            )}
        </div >
    );
}
