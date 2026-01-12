import { motion } from 'framer-motion';
import { Activity, Users, Clock, CheckCircle2 } from 'lucide-react';


const stats = [
    {
        label: "24h Volume",
        value: "$2.4M",
        change: "+12.5%",
        icon: <Activity className="w-4 h-4 text-primary" />,
        color: "from-primary/20 to-primary/5"
    },
    {
        label: "Active Resolvers",
        value: "42",
        change: "+3",
        icon: <Users className="w-4 h-4 text-blue-400" />,
        color: "from-blue-500/20 to-blue-500/5"
    },
    {
        label: "Avg Fill Time",
        value: "~2.1s",
        change: "-0.4s",
        icon: <Clock className="w-4 h-4 text-green-400" />,
        color: "from-green-500/20 to-green-500/5"
    }
];

const fills = [
    { type: 'Sell', amount: '5,000 MOVE', to: 'USDC', time: '2s ago' },
    { type: 'Buy', amount: '12.5 ETH', to: 'MOVE', time: '5s ago' },
    { type: 'Sell', amount: '150,000 MOVE', to: 'USDC', time: '8s ago' },
    { type: 'Buy', amount: '0.5 WBTC', to: 'USDC', time: '12s ago' },
];

export const LivePulse = () => {
    return (
        <div className="w-full max-w-[500px] relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-[32px] blur-xl opacity-20 animate-pulse" />

            <div className="relative bg-zinc-900/50 backdrop-blur-xl rounded-[24px] border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-medium text-zinc-200">Market Pulse</span>
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">LIVE FEED</span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-px bg-white/5">
                    {stats.map((stat, i) => (
                        <div key={i} className={`p-6 bg-zinc-900/50 hover:bg-white/5 transition-colors ${i === 2 ? 'col-span-2' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                                    {stat.icon}
                                </div>
                                <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-green-500' : 'text-primary'}`}>
                                    {stat.change}
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-xs text-zinc-500">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Recent Fills Ticker */}
                <div className="p-4 border-t border-white/5 bg-black/20">
                    <div className="space-y-3">
                        {fills.map((fill, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.2 }}
                                className="flex justify-between items-center text-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-4 h-4 text-green-500/50" />
                                    <span className="text-zinc-300">
                                        <span className={fill.type === 'Buy' ? 'text-green-400' : 'text-red-400'}>{fill.type}</span>
                                        <span className="mx-1.5 text-zinc-600">·</span>
                                        {fill.amount} <span className="text-zinc-500">→</span> {fill.to}
                                    </span>
                                </div>
                                <span className="text-xs text-zinc-600 font-mono">{fill.time}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
