import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Lock, Zap, Shield, Timer } from 'lucide-react';

export default function CrossChainPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <main className="flex-1 container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">

                {/* Hero Section */}
                <div className="max-w-3xl mx-auto space-y-8 mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-sm font-medium">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                        </span>
                        Coming Soon
                    </div>

                    <h1 className="text-4xl md:text-6xl font-heading font-bold tracking-tight">
                        Seamless <span className="text-gradient">Cross-Chain</span> Intents
                    </h1>

                    <p className="text-xl text-muted-foreground leading-relaxed">
                        Say goodbye to vulnerable bridges. Intent Protocol uses
                        <span className="font-bold text-foreground"> Fusion+ Technology </span>
                        and
                        <span className="font-bold text-foreground"> HTLCs </span>
                        for trustless, atomic swaps between Movement and EVM chains.
                    </p>

                    <div className="flex gap-4 justify-center">
                        <Button size="lg" className="rounded-xl font-bold gap-2">
                            Join Waitlist <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button size="lg" variant="outline" className="rounded-xl">
                            Read the Whitepaper
                        </Button>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 gap-6 max-w-4xl w-full text-left">
                    <Card className="bg-muted/20 border-border/50 hover:border-primary/50 transition-colors">
                        <CardHeader>
                            <Zap className="h-8 w-8 text-primary mb-2" />
                            <CardTitle>Atomic Execution</CardTitle>
                        </CardHeader>
                        <CardContent className="text-muted-foreground">
                            Swaps are all-or-nothing. You either get your destination tokens, or you keep your source assets. No funds stuck in limbo.
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/20 border-border/50 hover:border-primary/50 transition-colors">
                        <CardHeader>
                            <Shield className="h-8 w-8 text-secondary mb-2" />
                            <CardTitle>Trustless Design</CardTitle>
                        </CardHeader>
                        <CardContent className="text-muted-foreground">
                            Powered by Hashed Timelock Contracts (HTLCs). No central authority or bridge validators to trust.
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/20 border-border/50 hover:border-primary/50 transition-colors">
                        <CardHeader>
                            <Lock className="h-8 w-8 text-blue-500 mb-2" />
                            <CardTitle>Self-Custody</CardTitle>
                        </CardHeader>
                        <CardContent className="text-muted-foreground">
                            You maintain control of your assets until the swap is finalized. No depositing into third-party bridge pools.
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/20 border-border/50 hover:border-primary/50 transition-colors">
                        <CardHeader>
                            <Timer className="h-8 w-8 text-orange-500 mb-2" />
                            <CardTitle>Dutch Auction Pricing</CardTitle>
                        </CardHeader>
                        <CardContent className="text-muted-foreground">
                            Resolvers compete to fill your cross-chain order, ensuring you get the best market rate without MEV.
                        </CardContent>
                    </Card>
                </div>

                {/* Diagram Teaser */}
                <div className="mt-20 max-w-3xl w-full p-8 rounded-3xl bg-glass border border-white/10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />
                    <h3 className="text-lg font-bold mb-4 relative z-10">How it Works</h3>
                    <div className="flex items-center justify-between text-sm md:text-base font-mono relative z-10">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold">You</div>
                            <span className="text-muted-foreground">Movement</span>
                        </div>
                        <div className="flex-1 border-t-2 border-dashed border-primary/30 mx-4 relative">
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-2 text-xs text-muted-foreground">HTLC Lock</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center font-bold">Resolver</div>
                            <span className="text-muted-foreground">EVM Chain</span>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
}
