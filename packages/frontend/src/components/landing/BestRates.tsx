
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BestRates() {
    // Placeholder for simple display, can act as a static component for now or mock data
    const rates = [
        { pair: "MOVE / USDC", rate: "$0.45", change: "+1.2%" },
        { pair: "ETH / USDC", rate: "$2250.00", change: "-0.5%" },
        { pair: "BTC / USDC", rate: "$42000.00", change: "+2.1%" },
    ];

    return (
        <section className="py-24 bg-card/50 border-y border-border/40">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-primary" />
                        Live Market Rates
                    </h2>
                    <Link to="/swap" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                        View all markets <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {rates.map((item, i) => (
                        <Link key={i} to="/swap">
                            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {item.pair}
                                    </CardTitle>
                                    <span className={item.change.startsWith('+') ? "text-green-500 text-xs" : "text-red-500 text-xs"}>
                                        {item.change}
                                    </span>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{item.rate}</div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
