import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

export interface TokenPair {
    id: string;
    baseSymbol: string;
    quoteSymbol: string;
    tradingViewSymbol: string;
    baseIcon?: string;
    quoteIcon?: string;
}

export const TOKEN_PAIRS: TokenPair[] = [
    {
        id: 'weth-usdt',
        baseSymbol: 'ETH',
        quoteSymbol: 'USDT',
        tradingViewSymbol: 'BINANCE:ETHUSDT',
        baseIcon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
        quoteIcon: "https://cryptologos.cc/logos/tether-usdt-logo.png"
    },
    {
        id: 'move-usdt',
        baseSymbol: 'MOVE',
        quoteSymbol: 'USDT',
        tradingViewSymbol: 'BINANCE:APTUSDT',
        baseIcon: "https://raw.githubusercontent.com/kitelabs-io/mvmt-tokens/main/logos/MOVE.png",
        quoteIcon: "https://cryptologos.cc/logos/tether-usdt-logo.png"
    },
    {
        id: 'weth-usdc',
        baseSymbol: 'ETH',
        quoteSymbol: 'USDC',
        tradingViewSymbol: 'BINANCE:ETHUSDC',
        baseIcon: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
        quoteIcon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png"
    },
    {
        id: 'move-usdc',
        baseSymbol: 'MOVE',
        quoteSymbol: 'USDC',
        tradingViewSymbol: 'BINANCE:APTUSDC',
        baseIcon: "https://raw.githubusercontent.com/kitelabs-io/mvmt-tokens/main/logos/MOVE.png",
        quoteIcon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png"
    },
    {
        id: 'usdt-usdc',
        baseSymbol: 'USDT',
        quoteSymbol: 'USDC',
        tradingViewSymbol: 'BINANCE:USDTUSDC',
        baseIcon: "https://cryptologos.cc/logos/tether-usdt-logo.png",
        quoteIcon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png"
    },
];

interface TokenPairSelectorProps {
    value: TokenPair;
    onSelect: (pair: TokenPair) => void;
}

export function TokenPairSelector({ value, onSelect }: TokenPairSelectorProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="lg"
                    className="h-12 px-3 gap-2 text-lg font-semibold hover:bg-muted/50 data-[state=open]:bg-muted/50"
                >
                    <div className="flex items-center -space-x-2 mr-1">
                        {value.baseIcon && <img src={value.baseIcon} alt={value.baseSymbol} className="w-6 h-6 rounded-full ring-2 ring-background z-10" />}
                        {value.quoteIcon && <img src={value.quoteIcon} alt={value.quoteSymbol} className="w-6 h-6 rounded-full ring-2 ring-background" />}
                    </div>
                    <span>{value.baseSymbol}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-muted-foreground">{value.quoteSymbol}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground opacity-50 ml-1" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[240px] p-2">
                {TOKEN_PAIRS.map((pair) => (
                    <DropdownMenuItem
                        key={pair.id}
                        onClick={() => onSelect(pair)}
                        className="cursor-pointer h-12 gap-3"
                    >
                        <div className="flex items-center -space-x-2">
                            {pair.baseIcon && <img src={pair.baseIcon} alt={pair.baseSymbol} className="w-5 h-5 rounded-full ring-2 ring-card z-10" />}
                            {pair.quoteIcon && <img src={pair.quoteIcon} alt={pair.quoteSymbol} className="w-5 h-5 rounded-full ring-2 ring-card" />}
                        </div>
                        <div className="flex items-center">
                            <span className="font-medium">{pair.baseSymbol}</span>
                            <span className="text-muted-foreground mx-1">/</span>
                            <span className="text-muted-foreground">{pair.quoteSymbol}</span>
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
