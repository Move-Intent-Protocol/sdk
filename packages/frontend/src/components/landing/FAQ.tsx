
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

export function FAQ() {
    return (
        <section className="py-32 bg-background">
            <div className="container mx-auto px-4 max-w-3xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Frequently Asked Questions</h2>
                    <p className="text-lg text-muted-foreground">Everything you need to know about Intent Protocol.</p>
                </div>

                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>What is an Intent?</AccordionTrigger>
                        <AccordionContent>
                            An intent is a signed message that specifies *what* you want (e.g., "Exchange 10 MOVE for at least 5 USDC"), rather than *how* to do it. Resolvers compete to fulfill this request.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger>Do I need to pay for gas?</AccordionTrigger>
                        <AccordionContent>
                            No! With Intent Protocol, the Resolver pays the network gas fees. You only need to sign the intent message from your wallet.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                        <AccordionTrigger>Is it safe?</AccordionTrigger>
                        <AccordionContent>
                            Yes. Your funds are never locked in the protocol until the swap is executed atomically. For cross-chain swaps, we use HTLCs (Hashed Timelock Contracts) to ensure trustless execution.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                        <AccordionTrigger>Which chains are supported?</AccordionTrigger>
                        <AccordionContent>
                            Currently, we are live on the Movement Testnet. Cross-chain support for EVM chains (Sepolia, etc.) is coming soon via Cross-Chain Swap.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </section>
    )
}
