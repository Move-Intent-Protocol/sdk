import { useEffect, useState } from "react";
import { PriceService } from "@/lib/pyth";
import { PriceData } from "@/types";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const ASSETS = [
    { symbol: "MOVE", name: "Movement Coin", icon: "https://raw.githubusercontent.com/kitelabs-io/mvmt-tokens/main/logos/MOVE.png" },
    { symbol: "ETH", name: "WETH.e", icon: "https://raw.githubusercontent.com/kitelabs-io/mvmt-tokens/main/logos/WETH.png" },
    { symbol: "USDC", name: "USDC.e", icon: "https://raw.githubusercontent.com/kitelabs-io/mvmt-tokens/main/logos/USDC.png" },
    { symbol: "USDT", name: "USDT.e", icon: "https://raw.githubusercontent.com/kitelabs-io/mvmt-tokens/main/logos/USDT.png" }
];

export function OraclePage() {
    const [prices, setPrices] = useState<Record<string, PriceData>>({});
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchPrices = async () => {
        setLoading(true);
        const data = await PriceService.getLatestPrices();
        setPrices(data);
        setLastUpdated(new Date());
        setLoading(false);
    };

    useEffect(() => {
        fetchPrices();
        const interval = setInterval(fetchPrices, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="container mx-auto p-8 max-w-5xl space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Movement Oracles</h1>
                    <p className="text-muted-foreground mt-2">
                        Real-time price feeds powered by <a href="https://pyth.network" className="text-primary hover:underline font-medium">Pyth Network</a>
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                        Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
                    </span>
                    <Button variant="outline" size="icon" onClick={fetchPrices} disabled={loading}>
                        <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {ASSETS.map((asset) => {
                    const priceData = prices[asset.symbol];
                    const price = PriceService.formatPrice(priceData);
                    // Mock change for demo since Pyth Hermes Latest doesn't give 24h change directly without historical query
                    const change = (Math.random() * 5) * (Math.random() > 0.5 ? 1 : -1);

                    return (
                        <div key={asset.symbol} className="bg-card border rounded-xl p-6 shadow-sm flex flex-col justify-between h-[180px] hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-accent/10 p-2 flex items-center justify-center overflow-hidden">
                                        <img src={asset.icon} alt={asset.name} className="h-full w-full object-contain" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{asset.symbol}</h3>
                                        <p className="text-xs text-muted-foreground">{asset.name}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                {loading && !price ? (
                                    <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                    </div>
                                )}

                                <div className={cn("flex items-center text-sm font-medium", change >= 0 ? "text-green-500" : "text-red-500")}>
                                    {change >= 0 ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}
                                    {Math.abs(change).toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-muted/30 rounded-lg p-6 text-center border-dashed border-2">
                <h3 className="font-semibold mb-2">Build with Oracles</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Access these feeds in your Move smart contracts to build DeFi applications on Movement.
                </p>
                <div className="flex justify-center gap-4">
                    <Button variant="link" className="text-primary" asChild>
                        <a href="https://docs.movementnetwork.xyz/devs/oracles" target="_blank" rel="noreferrer">
                            Read the Docs &rarr;
                        </a>
                    </Button>
                    <Button variant="link" className="text-muted-foreground" asChild>
                        <a href="/">
                            Powered by Intent Protocol &uarr;
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}
