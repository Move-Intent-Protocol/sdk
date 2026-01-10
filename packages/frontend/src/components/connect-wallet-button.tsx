import { useState } from 'react';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useWallet } from '@/context/wallet-provider';
import { NETWORK_MAP } from '@/lib/wallet/networks';

function shortenAddress(address: string, chars = 4): string {
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// Nightly Wallet Icon
const NightlyIcon = () => (
    <img
        src="https://docs.nightly.app/img/logo.png"
        alt="Nightly Wallet"
        width={32}
        height={32}
        className="rounded-lg"
    />
);

export function ConnectWalletButton() {
    const { connected, connecting, account, network, connect, disconnect, changeNetwork } = useWallet();
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleConnect = async () => {
        await connect();
        setDialogOpen(false);
    };

    if (!connected) {
        return (
            <>
                <Button onClick={() => setDialogOpen(true)} disabled={connecting} className="gap-2">
                    <Wallet className="h-4 w-4" />
                    {connecting ? 'Connecting...' : 'Connect Wallet'}
                </Button>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Connect Wallet</DialogTitle>
                            <DialogDescription>
                                Connect your wallet to start using Intent Protocol
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-3 pt-4">
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-3 h-14 text-left"
                                onClick={handleConnect}
                                disabled={connecting}
                            >
                                <NightlyIcon />
                                <div className="flex flex-col">
                                    <span className="font-semibold">Nightly Wallet</span>
                                    <span className="text-xs text-muted-foreground">Connect to Nightly</span>
                                </div>
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </>
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
