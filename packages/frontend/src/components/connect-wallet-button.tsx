import { Wallet, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWallet } from '@/context/wallet-provider';
import { NETWORK_MAP } from '@/lib/wallet/networks';

function shortenAddress(address: string, chars = 4): string {
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function ConnectWalletButton() {
    const { connected, connecting, account, network, connect, disconnect, changeNetwork } = useWallet();

    if (!connected) {
        return (
            <Button onClick={connect} disabled={connecting} className="gap-2">
                <Wallet className="h-4 w-4" />
                {connecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Wallet className="h-4 w-4" />
                    {account?.address ? shortenAddress(account.address.toString()) : 'Connected'}
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {network && (
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                        Network: {NETWORK_MAP[network.chainId?.toString()]?.buttonName || network.name}
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => changeNetwork(250)}>
                    Switch to Bardock Testnet
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeNetwork(177)}>
                    Switch to Porto Testnet
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeNetwork(126)}>
                    Switch to Mainnet
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={disconnect} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
