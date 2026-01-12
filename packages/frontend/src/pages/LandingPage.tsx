import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Shield, Globe, TrendingUp, Sparkles } from 'lucide-react';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { BestRates } from '@/components/landing/BestRates';
import { FAQ } from '@/components/landing/FAQ';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LivePulse } from '@/components/landing/LivePulse';
import { useRef } from 'react';

// Hero Section Component
const Hero = () => {
    return (
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden min-h-[90vh] flex items-center">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-40 animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[100px] mix-blend-screen opacity-30" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Text Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="space-y-8 text-center lg:text-left"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mx-auto lg:mx-0"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            Live on Movement Testnet
                        </motion.div>

                        <h1 className="text-5xl md:text-7xl font-heading font-bold leading-[1.1] tracking-tight">
                            The Future of <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-pink-500 animate-gradient-x">
                                Intent Trading
                            </span>
                        </h1>

                        <p className="text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
                            Stop fighting for gas. Express your intent using <span className="text-foreground font-semibold">Dutch Auctions</span> and let professional Resolvers execute your trades optimally, every time.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Link to="/swap">
                                <Button size="lg" className="h-14 px-8 text-lg rounded-2xl font-bold bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-opacity w-full sm:w-auto shadow-lg shadow-primary/25">
                                    Start Swapping <Sparkles className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-2xl gap-2 group w-full sm:w-auto border-foreground/10 hover:bg-foreground/5">
                                Explore Cross-Chain <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </div>
                    </motion.div>

                    {/* Swap Widget with 3D-ish effect */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative mx-auto w-full max-w-[500px]"
                    >
                        <LivePulse />
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

// Features Section with Scroll Reveal
const Features = () => {
    const features = [
        {
            icon: <Zap className="h-6 w-6" />,
            title: "Gasless Swaps",
            desc: "Sign a message, not a transaction. Resolvers pay the gas, you just get the tokens.",
            color: "text-yellow-400",
            bg: "bg-yellow-400/10"
        },
        {
            icon: <Shield className="h-6 w-6" />,
            title: "MEV Protection",
            desc: "Your intents are protected from sandwich attacks. No slippage, just guaranteed execution.",
            color: "text-blue-400",
            bg: "bg-blue-400/10"
        },
        {
            icon: <TrendingUp className="h-6 w-6" />,
            title: "Optimal Pricing",
            desc: "Dutch Auctions ensure fair market discovery. Resolvers compete to fill your order.",
            color: "text-green-400",
            bg: "bg-green-400/10"
        }
    ];

    return (
        <section className="py-32 bg-zinc-900/30 border-y border-white/5">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-heading font-bold mb-6"
                    >
                        Why Trade with Intents?
                    </motion.h2>
                    <p className="text-lg text-muted-foreground">
                        Legacy swaps are inefficient. Upgrade to the Intent Protocol standard.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="p-8 rounded-[32px] bg-background border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden"
                        >
                            <div className={`w-14 h-14 rounded-2xl ${f.bg} flex items-center justify-center mb-6 ${f.color} group-hover:scale-110 transition-transform duration-300`}>
                                {f.icon}
                            </div>
                            <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {f.desc}
                            </p>
                            <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// Cross Chain Section
const CrossChainSection = () => {
    return (
        <section className="py-32 relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 rounded-[48px] border border-white/10 p-8 md:p-16 text-center overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="max-w-3xl mx-auto space-y-8 relative z-10"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                            <Globe className="w-4 h-4" /> Coming Soon
                        </div>

                        <h2 className="text-4xl md:text-6xl font-heading font-bold">
                            Seamless <span className="text-primary">Cross-Chain</span>
                        </h2>

                        <p className="text-xl text-muted-foreground">
                            Seamlessly swap assets between Movement, Ethereum, and Aptos using Hash Time Locked Contracts (HTLC). No bridges, just intents.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto pt-8">
                            <input
                                type="email"
                                placeholder="Enter your email for early access"
                                className="w-full px-6 py-4 rounded-xl border border-white/10 bg-white/5 focus:ring-2 focus:ring-primary focus:outline-none transition-all text-center sm:text-left backdrop-blur-sm"
                            />
                            <Button size="lg" className="w-full sm:w-auto h-[58px] rounded-xl font-bold text-lg px-8">
                                Join Waitlist
                            </Button>
                        </div>
                    </motion.div>

                    {/* Decorative Orbit */}
                    <div className="absolute -bottom-[200px] -left-[200px] w-[500px] h-[500px] border border-white/5 rounded-full animate-[spin_20s_linear_infinite]" />
                    <div className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] border border-white/5 rounded-full animate-[spin_30s_linear_infinite_reverse]" />
                </div>
            </div>
        </section>
    );
};

export default function LandingPage() {
    return (
        <div className="min-h-screen flex flex-col bg-black selection:bg-primary/30 text-foreground">
            <Header />

            <main className="flex-1">
                <Hero />
                <BestRates />
                <Features />
                <CrossChainSection />
                <FAQ />
            </main>

            <Footer />
        </div>
    );
}
