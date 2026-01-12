
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
                        Transaction Hash: <span className="font-mono text-xs">{order.order_hash}</span>
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-8 space-y-6">
                    {/* Status Card */}
                    <Card>
                        <CardContent className="pt-6 flex justify-between items-center">
                            <span className="font-semibold">Status</span>
                            <Badge variant={
                                order.status === 'FILLED' ? 'default' :
                                    order.status === 'CANCELLED' ? 'destructive' :
                                        order.status === 'EXPIRED' ? 'secondary' :
                                            'outline'
                            }>
                                {order.status}
                            </Badge>
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
                                    <p className="font-medium text-lg">{order.sell_amount} <span className="text-muted-foreground text-sm">{order.sell_token}</span></p>
                                </div>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-muted-foreground">Receive</p>
                                <div className="flex items-center gap-2 justify-end">
                                    <p className="font-medium text-lg text-green-500">{order.buy_amount} <span className="text-muted-foreground text-sm">{order.buy_token}</span></p>
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
                                <span>{formatDistanceToNow(order.timestamp * 1000 + 300000, { addSuffix: true })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
