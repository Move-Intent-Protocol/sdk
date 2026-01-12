
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { TOKENS } from './forms/TokenSelector';

const getToken = (typeOrSymbol: string) => {
    return TOKENS.find(t => t.type === typeOrSymbol || t.symbol === typeOrSymbol) || {
        symbol: "UNK",
        decimals: 8,
        icon: "",
        type: typeOrSymbol
    };
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
}

interface OrderListProps {
    orders: Order[];
    onSelectOrder: (order: Order) => void;
    onCancelOrder?: (order: Order) => void;
    isLoading?: boolean;
}

export function OrderList({ orders, onSelectOrder, onCancelOrder, isLoading }: OrderListProps) {
    if (isLoading) {
        return <div className="text-center py-10">Loading orders...</div>;
    }

    if (orders.length === 0) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                    No orders found.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Your Orders</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.order_hash} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectOrder(order)}>
                                <TableCell className="font-medium">
                                    {/* Simplified for now, logic to determine Buy/Sell direction needed if using pair */}
                                    Swap
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5">
                                            {getToken(order.sell_token).icon && <img src={getToken(order.sell_token).icon} className="w-4 h-4 rounded-full" />}
                                            <span className="text-red-500 font-mono text-xs">-{order.sell_amount}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {getToken(order.buy_token).icon && <img src={getToken(order.buy_token).icon} className="w-4 h-4 rounded-full" />}
                                            <span className="text-green-500 font-mono text-xs">+{order.buy_amount}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={
                                        order.status === 'FILLED' ? 'default' : // default in shadcn is primary color (often black/dark)
                                            order.status === 'CANCELLED' ? 'destructive' :
                                                order.status === 'EXPIRED' ? 'secondary' :
                                                    'outline'
                                    }>
                                        {order.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(order.timestamp * 1000, { addSuffix: true })}
                                </TableCell>
                                <TableCell className="text-right">
                                    {order.status === 'CREATED' && onCancelOrder && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCancelOrder(order);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                    <Button variant="link" size="sm" className="ml-2">
                                        View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
