
import { SwapCard } from '../components/intent-swap/forms/SwapCard';
import { EscrowBalance } from '../components/intent-swap/metrics/EscrowBalance';
import { OrderTracker } from '../components/intent-swap/metrics/OrderTracker';

export default function SwapPage() {
    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-8 text-center">Movement Intent Swap</h1>

            <div className="flex flex-wrap justify-center gap-8">
                {/* Left Column: Swap Action */}
                <div className="space-y-6">
                    <SwapCard />
                </div>

                {/* Right Column: Management */}
                <div className="space-y-6">
                    <EscrowBalance />
                    <OrderTracker />
                </div>
            </div>
        </div>
    );
}
