import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import { useSwap } from '@/context/SwapContext';
import { TokenPair } from './TokenPairSelector';
import { TOKENS } from '@/components/intent-swap/forms/TokenSelector';
import { PriceService } from '@/lib/pyth';
import { PriceData, Token } from '@/types';
import { toast } from 'sonner';

interface LimitOrderFormProps {
    selectedPair: TokenPair;
}

type OrderSide = 'buy' | 'sell';
type OrderStep = 'idle' | 'depositing' | 'signing';

// Map base symbol to actual token from TOKENS array
const getTokenBySymbol = (symbol: string): Token | undefined => {
    const symbolMap: Record<string, string> = {
        'ETH': 'WETH.e',
        'USDC': 'USDC.e',
        'USDT': 'USDT.e',
        'MOVE': 'MOVE',
    };
    const mappedSymbol = symbolMap[symbol] || symbol;
    return TOKENS.find(t => t.symbol === mappedSymbol);
};

export function LimitOrderForm({ selectedPair }: LimitOrderFormProps) {
    const { buildAndSubmitIntent, isLoading, escrowBalance, depositToEscrow } = useSwap();
    const [orderSide, setOrderSide] = useState<OrderSide>('buy');
    const [amount, setAmount] = useState('');
    const [sliderValue, setSliderValue] = useState([0]);
    const [limitPrice, setLimitPrice] = useState('');
    const [isManualPrice, setIsManualPrice] = useState(false);
    const [duration, setDuration] = useState('3600'); // Default 1 hour
    const [prices, setPrices] = useState<Record<string, PriceData>>({});
    const [priceLoading, setPriceLoading] = useState(false);
    const [orderStep, setOrderStep] = useState<OrderStep>('idle');

    // Fetch prices
    useEffect(() => {
        const fetchPrices = async () => {
            setPriceLoading(true);
            const data = await PriceService.getLatestPrices();
            setPrices(data);
            setPriceLoading(false);

            // Auto-populate limit price with market price if not manually edited
            if (!isManualPrice && data[selectedPair.baseSymbol]) {
                const price = PriceService.formatPrice(data[selectedPair.baseSymbol]);
                if (price) setLimitPrice(price.toFixed(4));
            }
        };
        fetchPrices();
        const interval = setInterval(fetchPrices, 15000);
        return () => clearInterval(interval);
    }, [selectedPair.baseSymbol, isManualPrice]); // Refresh when pair or manual flag changes

    // Reset manual flag and price when pair changes
    useEffect(() => {
        setIsManualPrice(false);
        setLimitPrice('');
    }, [selectedPair.baseSymbol]);

    const currentPrice = PriceService.formatPrice(prices[selectedPair.baseSymbol]);

    const handlePercentOffset = (percent: number) => {
        if (!currentPrice) return;
        const newPrice = currentPrice * (1 + percent);
        setLimitPrice(newPrice.toFixed(4));
        setIsManualPrice(true);
    };

    // Calculate if deposit is needed
    const getSellTokenAndAmount = () => {
        const baseToken = getTokenBySymbol(selectedPair.baseSymbol);
        const quoteToken = getTokenBySymbol(selectedPair.quoteSymbol);
        if (!baseToken || !quoteToken || !amount) return { sellToken: null, sellAmount: 0 };

        const baseAmount = parseFloat(amount);
        const limitPriceVal = parseFloat(limitPrice) || currentPrice || 0;

        if (orderSide === 'buy') {
            // Buy Base: Pay Quote
            return { sellToken: quoteToken, sellAmount: baseAmount * limitPriceVal };
        } else {
            // Sell Base: Pay Base
            return { sellToken: baseToken, sellAmount: baseAmount };
        }
    };

    const { sellToken, sellAmount } = getSellTokenAndAmount();
    const sellTokenEscrowBalance = sellToken ? (escrowBalance[sellToken.type] || 0) : 0;
    const needsDeposit = sellAmount > sellTokenEscrowBalance;

    const handleSubmit = async () => {
        if (!amount || isNaN(parseFloat(amount))) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (!limitPrice || isNaN(parseFloat(limitPrice))) {
            toast.error('Please enter a valid limit price');
            return;
        }

        const baseToken = getTokenBySymbol(selectedPair.baseSymbol);
        const quoteToken = getTokenBySymbol(selectedPair.quoteSymbol); // Dynamic Quote

        if (!baseToken || !quoteToken) {
            toast.error('Token not found');
            return;
        }

        try {
            const baseAmountVal = parseFloat(amount);
            const limitPriceVal = parseFloat(limitPrice);

            // For Limit Orders:
            // BUY: Pay Quote (LimitPrice * Amount), Receive Base (Amount)
            // SELL: Pay Base (Amount), Receive Quote (LimitPrice * Amount)

            let sellTokenFinal, buyToken, sellAmountFinal, buyAmount;

            if (orderSide === 'buy') {
                // Buy Base Token using Quote Token
                sellTokenFinal = quoteToken;
                buyToken = baseToken;
                buyAmount = baseAmountVal; // User wants to buy specific amount of Base
                sellAmountFinal = baseAmountVal * limitPriceVal; // User pays Quote
            } else {
                // Sell Base Token for Quote Token
                sellTokenFinal = baseToken;
                buyToken = quoteToken;
                sellAmountFinal = baseAmountVal; // User sells specific amount of Base
                buyAmount = baseAmountVal * limitPriceVal; // User wants Quote
            }

            // Step 1: Check if deposit is needed
            const currentEscrowBalance = escrowBalance[sellTokenFinal.type] || 0;
            const needsDepositNow = sellAmountFinal > currentEscrowBalance;
            const depositAmountNow = needsDepositNow ? sellAmountFinal - currentEscrowBalance : 0;

            if (needsDepositNow) {
                setOrderStep('depositing');
                toast.info(`Depositing ${depositAmountNow.toFixed(4)} ${sellTokenFinal.symbol}...`, {
                    description: "Please approve the deposit transaction"
                });

                await depositToEscrow(depositAmountNow, sellTokenFinal.type, sellTokenFinal.decimals);
                toast.success(`Deposited ${depositAmountNow.toFixed(4)} ${sellTokenFinal.symbol}`);

                // Wait for wallet adapter to reset after transaction
                toast.info("Syncing wallet state...");
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // Step 2: Sign and submit intent
            setOrderStep('signing');

            await buildAndSubmitIntent({
                sellToken: sellTokenFinal.type,
                buyToken: buyToken.type,
                sellAmount: sellAmountFinal,
                buyAmount,
                slippage: 0, // LIMIT ORDER implies strict price, no slippage buffer logic needed if we define specific amounts
                // However, SwapContext might add 5% buffer to startBuyAmount.
                // For a resting limit order, this is fine (it starts higher/lower and decays to our limit).
                sellDecimals: sellTokenFinal.decimals,
                buyDecimals: buyToken.decimals,
                duration: parseInt(duration),
                isLimitOrder: true
            });

            toast.success('Limit Order Submitted', {
                description: `${orderSide === 'buy' ? 'Buying' : 'Selling'} ${amount} ${selectedPair.baseSymbol} at $${limitPriceVal} ${selectedPair.quoteSymbol}`,
            });
            setAmount('');
        } catch (e: any) {
            if (e.message?.includes('rejected') || e.message?.includes('cancelled')) {
                toast.info('Transaction cancelled');
            } else {
                toast.error('Order Failed', { description: e.message });
            }
        } finally {
            setOrderStep('idle');
        }
    };

    // Button text based on state
    const getButtonText = () => {
        if (orderStep === 'depositing') return "Depositing...";
        if (orderStep === 'signing' || isLoading) return "Signing...";
        if (!amount) return "Enter an amount";
        if (needsDeposit) return `Deposit & Limit ${orderSide === 'buy' ? 'Buy' : 'Sell'}`;
        return `Limit ${orderSide === 'buy' ? 'Buy' : 'Sell'} ${selectedPair.baseSymbol}`;
    };

    return (
        <Card className="border-muted bg-card/50 mt-4">
            <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <div className="space-y-1">
                        <h3 className="text-sm font-semibold">Limit Order</h3>

                    </div>
                </div>

                {/* Buy/Sell Tabs */}
                <Tabs value={orderSide} onValueChange={(v) => setOrderSide(v as OrderSide)}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger
                            value="buy"
                            className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
                        >
                            Buy
                        </TabsTrigger>
                        <TabsTrigger
                            value="sell"
                            className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                        >
                            Sell
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Price Display */}
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Market Price</span>
                    <span className="font-mono">
                        {priceLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin inline" />
                        ) : currentPrice ? (
                            `$${currentPrice.toFixed(2)}`
                        ) : (
                            '-'
                        )}
                    </span>
                </div>

                {/* Limit Price Input */}
                <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Limit Price ({selectedPair.quoteSymbol})</label>
                    <div className="flex gap-2">
                        {orderSide === 'buy' ? (
                            <>
                                <Button
                                    variant="outline"
                                    className="h-6 text-[10px] px-2 py-0 border-green-500/30 text-green-500 hover:bg-green-500/10"
                                    onClick={() => handlePercentOffset(-0.05)}
                                >
                                    -5%
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-6 text-[10px] px-2 py-0 border-green-500/30 text-green-500 hover:bg-green-500/10"
                                    onClick={() => handlePercentOffset(-0.10)}
                                >
                                    -10%
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    className="h-6 text-[10px] px-2 py-0 border-red-500/30 text-red-500 hover:bg-red-500/10"
                                    onClick={() => handlePercentOffset(0.05)}
                                >
                                    +5%
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-6 text-[10px] px-2 py-0 border-red-500/30 text-red-500 hover:bg-red-500/10"
                                    onClick={() => handlePercentOffset(0.10)}
                                >
                                    +10%
                                </Button>
                            </>
                        )}
                    </div>
                    <Input
                        type="number"
                        placeholder="0.00"
                        value={limitPrice}
                        onChange={(e) => {
                            setLimitPrice(e.target.value);
                            setIsManualPrice(true);
                        }}
                        className="h-12 text-lg font-mono"
                    />
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <label className="text-sm text-muted-foreground">Amount ({selectedPair.baseSymbol})</label>
                        <span className="text-xs text-muted-foreground">
                            {orderSide === 'buy' ? selectedPair.quoteSymbol : selectedPair.baseSymbol} Balance: {
                                (() => {
                                    const token = getTokenBySymbol(orderSide === 'buy' ? selectedPair.quoteSymbol : selectedPair.baseSymbol);
                                    return escrowBalance[token?.type || '']?.toFixed(4) || '0.00';
                                })()
                            }
                        </span>
                    </div>
                    <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="h-12 text-lg font-mono"
                    />
                </div>

                {/* Percentage Slider */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                    </div>
                    <Slider
                        value={sliderValue}
                        onValueChange={(val) => {
                            setSliderValue(val);
                            const percentage = val[0] / 100;

                            const payToken = getTokenBySymbol(orderSide === 'buy' ? selectedPair.quoteSymbol : selectedPair.baseSymbol);
                            const balance = escrowBalance[payToken?.type || ''] || 0;

                            let newAmount = 0;
                            if (orderSide === 'buy') {
                                // Buying Base: Pay Quote.
                                const price = parseFloat(limitPrice) || currentPrice;
                                if (price) {
                                    newAmount = (balance * percentage) / price;
                                }
                            } else {
                                // Selling Base: Pay Base.
                                newAmount = balance * percentage;
                            }

                            // Safe rounding down to evitar "Insufficient Balance" due to rounding up
                            const safeFixed = (num: number, decimals: number) => {
                                const multiplier = Math.pow(10, decimals);
                                return (Math.floor(num * multiplier) / multiplier).toFixed(decimals);
                            };

                            setAmount(newAmount > 0 ? safeFixed(newAmount, 6) : '');
                        }}
                        max={100}
                        step={25}
                        className="w-full"
                    />
                </div>

                {/* Duration Selector */}
                <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Duration</label>
                    <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="300">5 Minutes</SelectItem>
                            <SelectItem value="3600">1 Hour</SelectItem>
                            <SelectItem value="86400">24 Hours</SelectItem>
                            <SelectItem value="604800">7 Days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Summary: Pay & Receive */}
                <div className="bg-muted/30 p-3 rounded-md space-y-2 mt-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">You Pay</span>
                        <span className="font-mono">
                            {orderSide === 'buy' ? (
                                <>
                                    {amount && limitPrice ? (parseFloat(amount) * parseFloat(limitPrice)).toFixed(6) : '0.00'}{' '}
                                    <span className="text-xs text-muted-foreground">{selectedPair.quoteSymbol}</span>
                                </>
                            ) : (
                                <>
                                    {amount || '0.00'}{' '}
                                    <span className="text-xs text-muted-foreground">{selectedPair.baseSymbol}</span>
                                </>
                            )}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                        <span className="text-muted-foreground">You Receive</span>
                        <span className="font-mono text-green-500">
                            {orderSide === 'buy' ? (
                                <>
                                    {amount || '0.00'}{' '}
                                    <span className="text-xs text-green-500/70">{selectedPair.baseSymbol}</span>
                                </>
                            ) : (
                                <>
                                    {amount && limitPrice ? (parseFloat(amount) * parseFloat(limitPrice)).toFixed(6) : '0.00'}{' '}
                                    <span className="text-xs text-green-500/70">{selectedPair.quoteSymbol}</span>
                                </>
                            )}
                        </span>
                    </div>
                </div>

                {/* Submit Button */}
                <Button
                    className={`w-full h-12 font-semibold ${orderSide === 'buy'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                        }`}
                    onClick={handleSubmit}
                    disabled={isLoading || orderStep !== 'idle' || !amount || !limitPrice}
                >
                    {(isLoading || orderStep !== 'idle') ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {getButtonText()}
                        </>
                    ) : (
                        getButtonText()
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
