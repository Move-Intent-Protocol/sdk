
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Order } from './OrderList';
import { TOKENS } from './forms/TokenSelector';

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
    return formatted.toLocaleString(undefined, { maximumFractionDigits: 6 });
};

interface OrderDetailsProps {
    order: Order | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OrderDetails({ order, open, onOpenChange }: OrderDetailsProps) {
    if (!order) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>Order Details</SheetTitle>
                    <SheetDescription>
                        Transaction Hash: <span className="font-mono text-xs break-all block mt-1 bg-muted p-2 rounded">{order.order_hash}</span>
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-8 space-y-6">
                    {/* Status Card */}
                    <Card>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold">Status</span>
                                <Badge variant={
                                    order.status === 'FILLED' ? 'default' :
                                        order.status === 'CANCELLED' ? 'destructive' :
                                            order.status === 'EXPIRED' ? 'secondary' :
                                                'outline'
                                }>
                                    {order.status}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center border-t pt-4">
                                <span className="font-semibold">Type</span>
                                <Badge variant="outline">
                                    {order.order_type === 'LIMIT' ? 'Limit' : 'Market'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Swap Details */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-sm text-muted-foreground">Swap Information</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                                <p className="text-muted-foreground">Pay</p>
                                <div className="flex items-center gap-2">
                                    {getToken(order.sell_token).icon && <img src={getToken(order.sell_token).icon} className="w-6 h-6 rounded-full" />}
                                    <p className="font-medium text-lg">
                                        {formatAmount(order.sell_amount, getToken(order.sell_token))}
                                        <span className="text-muted-foreground text-sm ml-1">{getToken(order.sell_token).symbol}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-muted-foreground">Receive</p>
                                <div className="flex items-center gap-2 justify-end">
                                    <p className="font-medium text-lg text-green-500">
                                        {formatAmount(order.buy_amount, getToken(order.buy_token))}
                                        <span className="text-muted-foreground text-sm ml-1">{getToken(order.buy_token).symbol}</span>
                                    </p>
                                    {getToken(order.buy_token).icon && <img src={getToken(order.buy_token).icon} className="w-6 h-6 rounded-full" />}
                                </div>
                            </div>
                        </div>
                        <div className="pt-4 border-t text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Time</span>
                                <span>{new Date(order.timestamp * 1000).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Expires</span>
                                <span>{order.end_time ? formatDistanceToNow(order.end_time * 1000, { addSuffix: true }) : '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
