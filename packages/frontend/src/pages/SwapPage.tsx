import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SwapCard } from '../components/intent-swap/forms/SwapCard';
import { LimitOrderForm } from '../components/pro/LimitOrderForm';
import { TokenPairSelector, TOKEN_PAIRS } from '../components/pro/TokenPairSelector';
import { EscrowBalance } from '../components/intent-swap/metrics/EscrowBalance';
import { OrderTracker } from '../components/intent-swap/metrics/OrderTracker';

export default function SwapPage() {
    const [selectedPair, setSelectedPair] = useState(TOKEN_PAIRS[1]); // Default MOVE-USDC

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-8 text-center">Movement Intent Swap</h1>

            <div className="flex flex-wrap justify-center gap-8">
                {/* Left Column: Swap Action */}
                <div className="space-y-6 w-full max-w-[480px]">
                    <Tabs defaultValue="market" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="market">Market</TabsTrigger>
                            <TabsTrigger value="limit">Limit</TabsTrigger>
                        </TabsList>

                        <TabsContent value="market">
                            <SwapCard />
                        </TabsContent>

                        <TabsContent value="limit">
                            <div className="bg-card/50 rounded-lg p-4 mb-4 border border-muted/50 flex justify-center">
                                <TokenPairSelector value={selectedPair} onSelect={setSelectedPair} />
                            </div>
                            <LimitOrderForm selectedPair={selectedPair} />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Column: Management */}
                <div className="space-y-6 w-full max-w-[400px]">
                    <EscrowBalance />
                    <OrderTracker />
                </div>
            </div>
        </div>
    );
}
