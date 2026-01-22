
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { TOKENS } from './forms/TokenSelector';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const getToken = (typeOrSymbol: string) => {
    return TOKENS.find(t => t.type === typeOrSymbol || t.symbol === typeOrSymbol) || {
        symbol: "UNK",
        decimals: 8,
        icon: "",
        type: typeOrSymbol
    };
};

const formatAmount = (amount: number | string, token: any) => {
    if (!amount) return "0.00";
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    // If amount is already formatted (small number), show as-is
    // If amount is raw blockchain value (large number), divide by decimals
    const isRaw = val > 1000000; // Heuristic: if > 1M, likely raw
    const formatted = isRaw ? val / Math.pow(10, token.decimals) : val;
    return formatted.toLocaleString(undefined, { maximumFractionDigits: 4 });
};

export interface Order {
    order_hash: string;
    maker: string;
    sell_token: string; // symbol or type
    buy_token: string;
    sell_amount: number;
    buy_amount: number;
    status: 'CREATED' | 'FILLED' | 'CANCELLED' | 'EXPIRED';
    timestamp: number;
    end_time?: number; // Added field
    order_type?: 'MARKET' | 'LIMIT'; // Added field
}

interface OrderListProps {
    orders?: Order[];
    onSelectOrder?: (order: Order) => void;
    onCancelOrder?: (order: Order) => void;
    isLoading?: boolean;
    compact?: boolean;
    itemsPerPage?: number;
    filterType?: 'MARKET' | 'LIMIT'; // Added filter prop
}

export function OrderList({ orders = [], onSelectOrder, onCancelOrder, isLoading, compact, itemsPerPage = 10, filterType }: OrderListProps) {
    const [currentPage, setCurrentPage] = useState(1);

    // Filter orders based on type if filterType is provided
    const filteredOrders = filterType
        ? orders.filter(o => o.order_type === filterType || (!o.order_type && filterType === 'MARKET')) // Default legacy orders to MARKET
        : orders;

    if (isLoading) {
        return <div className="text-center py-10">Loading orders...</div>;
    }

    if (filteredOrders.length === 0) {
        return (
            <div className={compact ? 'py-4' : ''}>
                <Card className={compact ? 'border-0 shadow-none' : ''}>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        No {filterType ? filterType.toLowerCase() : ''} orders found.
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Pagination Logic
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

    const handlePrevious = () => setCurrentPage(p => Math.max(1, p - 1));
    const handleNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));

    return (
        <Card className={compact ? 'border-0 shadow-none' : ''}>
            {!compact && (
                <CardHeader>
                    <CardTitle>Your Orders</CardTitle>
                </CardHeader>
            )}
            <CardContent className={compact ? 'p-2' : ''}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden sm:table-cell">Time</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedOrders.map((order) => (
                            <TableRow key={order.order_hash} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectOrder?.(order)}>
                                <TableCell className="font-medium p-2 sm:p-4">
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {order.order_type === 'LIMIT' ? 'LIMIT' : 'MARKET'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="p-2 sm:p-4 font-mono text-sm">
                                    {(() => {
                                        const sellToken = getToken(order.sell_token);
                                        const buyToken = getToken(order.buy_token);

                                        const sVal = order.sell_amount / Math.pow(10, sellToken.decimals);
                                        const bVal = order.buy_amount / Math.pow(10, buyToken.decimals);

                                        if (!sVal || !bVal) return '-';

                                        const isSellStable = sellToken.symbol.includes("USDC") || sellToken.symbol.includes("USDT");
                                        const isBuyStable = buyToken.symbol.includes("USDC") || buyToken.symbol.includes("USDT");

                                        // If selling Base for Quote (Stable), Price = Quote / Base
                                        if (isBuyStable && !isSellStable) return `${(bVal / sVal).toFixed(4)}`;

                                        // If buying Base with Quote (Stable), Price = Quote / Base
                                        if (isSellStable && !isBuyStable) return `${(sVal / bVal).toFixed(4)}`;

                                        // Fallback: Buy / Sell
                                        return `${(bVal / sVal).toFixed(4)}`;
                                    })()}
                                </TableCell>
                                <TableCell className="p-2 sm:p-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5">
                                            {getToken(order.sell_token).icon && <img src={getToken(order.sell_token).icon} className="w-4 h-4 rounded-full" />}
                                            <span className="text-red-500 font-mono text-xs">-{formatAmount(order.sell_amount, getToken(order.sell_token))}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {getToken(order.buy_token).icon && <img src={getToken(order.buy_token).icon} className="w-4 h-4 rounded-full" />}
                                            <span className="text-green-500 font-mono text-xs">+{formatAmount(order.buy_amount, getToken(order.buy_token))}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="p-2 sm:p-4">
                                    <Badge variant={
                                        order.status === 'FILLED' ? 'default' :
                                            order.status === 'CANCELLED' ? 'destructive' :
                                                order.status === 'EXPIRED' ? 'secondary' :
                                                    'outline'
                                    }>
                                        {order.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground hidden sm:table-cell p-2 sm:p-4">
                                    {formatDistanceToNow(order.timestamp * 1000, { addSuffix: true })}
                                </TableCell>
                                <TableCell className="text-right p-2 sm:p-4">
                                    {order.status === 'CREATED' && onCancelOrder && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-xs"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCancelOrder(order);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                    <Button variant="link" size="sm" className="ml-2 h-8 px-2 text-xs">
                                        View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 px-2">
                        <div className="text-xs text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handlePrevious}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleNext}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
