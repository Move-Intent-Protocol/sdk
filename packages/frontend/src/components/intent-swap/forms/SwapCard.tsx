import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDown, Loader2 } from 'lucide-react';
import { useSwap } from '../../../context/SwapContext';
import { TokenSelector, TOKENS } from './TokenSelector';
import { Token } from '@/types';
import { PriceService } from '@/lib/pyth';
import { PriceData } from '@/types';

export function SwapCard() {
    const { buildAndSubmitIntent, isLoading } = useSwap();

    // State
    const [sellToken, setSellToken] = useState<Token>(TOKENS[0]); // MOVE
    const [buyToken, setBuyToken] = useState<Token>(TOKENS[2]); // USDC
    const [sellAmount, setSellAmount] = useState("");
    const [buyAmount, setBuyAmount] = useState("");

    const [prices, setPrices] = useState<Record<string, PriceData>>({});
    const [priceLoading, setPriceLoading] = useState(false);

    // Fetch Prices
    useEffect(() => {
        const fetch = async () => {
            setPriceLoading(true);
            const data = await PriceService.getLatestPrices();
            setPrices(data);
            setPriceLoading(false);
        };
        fetch();
        const interval = setInterval(fetch, 15000);
        return () => clearInterval(interval);
    }, []);

    // Calculate Output
    useEffect(() => {
        if (!sellAmount || isNaN(parseFloat(sellAmount))) {
            setBuyAmount("");
            return;
        }

        const sPrice = PriceService.formatPrice(prices[sellToken.symbol]);
        const bPrice = PriceService.formatPrice(prices[buyToken.symbol]);

        if (sPrice && bPrice) {
            const valUSD = parseFloat(sellAmount) * sPrice;
            const bAmount = valUSD / bPrice;
            setBuyAmount(bAmount.toFixed(6));
        } else {
            // Fallback mock if price missing
            setBuyAmount("");
        }
    }, [sellAmount, sellToken, buyToken, prices]);

    // Handlers
    const handleSwap = async () => {
        try {
            await buildAndSubmitIntent({
                sellToken: sellToken.type,
                buyToken: buyToken.type,
                sellAmount: parseFloat(sellAmount),
                buyAmount: parseFloat(buyAmount),
                slippage: 0.5,
                sellDecimals: sellToken.decimals,
                buyDecimals: buyToken.decimals
            });

            // Show toast
            toast.success("Order Submitted", {
                description: `Swapping ${sellAmount} ${sellToken.symbol} for ${buyAmount} ${buyToken.symbol}`,
            });
            setSellAmount("");
        } catch (e: any) {
            console.error(e);
            toast.error("Swap Failed", {
                description: e.message || "Unknown error occurred"
            });
        }
    };

    const getUsdValue = (amount: string, token: Token) => {
        if (!amount || isNaN(parseFloat(amount))) return "$0.00";
        const price = PriceService.formatPrice(prices[token.symbol]);
        return price ? `$${(parseFloat(amount) * price).toFixed(2)}` : "-";
    };

    return (
        <Card className="w-full max-w-[480px] shadow-lg border-muted">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                    <CardTitle>Swap</CardTitle>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {priceLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                        {priceLoading ? "Fetching Prices..." : "Live Prices"}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-1 relative">

                {/* Sell Input */}
                <div className="bg-muted/40 p-4 rounded-xl space-y-2 hover:border-gray-500 border border-transparent transition-colors">
                    <div className="flex justify-between mb-1">
                        <span className="text-sm text-muted-foreground">You pay</span>
                    </div>
                    <div className="flex gap-4 items-center">
                        <Input
                            type="number"
                            placeholder="0"
                            value={sellAmount}
                            onChange={e => setSellAmount(e.target.value)}
                            className="bg-transparent border-none text-3xl font-bold p-0 shadow-none focus-visible:ring-0 h-auto placeholder:text-muted-foreground/30"
                        />
                        <TokenSelector value={sellToken} onSelect={setSellToken} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {getUsdValue(sellAmount, sellToken)}
                    </div>
                </div>

                {/* Switcher */}
                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-[50%] z-10">
                    <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 rounded-xl border-4 border-background bg-muted hover:bg-background transition-all"
                        onClick={() => {
                            setSellToken(buyToken);
                            setBuyToken(sellToken);
                            setSellAmount(buyAmount);
                        }}
                    >
                        <ArrowDown className="h-4 w-4" />
                    </Button>
                </div>

                {/* Buy Input */}
                <div className="bg-muted/40 p-4 rounded-xl space-y-2 border border-transparent">
                    <div className="flex justify-between mb-1">
                        <span className="text-sm text-muted-foreground">You receive</span>
                    </div>
                    <div className="flex gap-4 items-center">
                        <Input
                            type="number"
                            placeholder="0"
                            value={buyAmount}
                            readOnly
                            className="bg-transparent border-none text-3xl font-bold p-0 shadow-none focus-visible:ring-0 h-auto placeholder:text-muted-foreground/30 text-muted-foreground"
                        />
                        <TokenSelector value={buyToken} onSelect={setBuyToken} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {getUsdValue(buyAmount, buyToken)}
                    </div>
                </div>

                {/* Info Accordion or Details could go here */}

            </CardContent>
            <CardFooter className="pt-2">
                <Button
                    className="w-full h-14 text-lg font-semibold rounded-xl"
                    onClick={handleSwap}
                    disabled={isLoading || !sellAmount || !buyAmount}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Confirming in Wallet...
                        </>
                    ) : (
                        !sellAmount ? "Enter an amount" : "Swap"
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
