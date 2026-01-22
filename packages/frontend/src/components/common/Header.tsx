import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { EscrowBalance } from '../intent-swap/metrics/EscrowBalance';
import { ConnectWalletButton } from '@/components/connect-wallet-button';
import { ModeToggle } from '@/components/mode-toggle';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useWallet } from '@/context/wallet-provider';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

export function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const { connected } = useWallet();

    const navItems = [
        { name: 'Swap', path: '/swap' },
        { name: 'Pro', path: '/pro' },
        { name: 'Oracle', path: '/oracle' },
        { name: 'Resolver', path: '/resolver' },
    ];

    if (connected) {
        navItems.push({ name: 'Orders', path: '/orders' });
    }

    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <Link to="/home" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary-foreground">
                                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span className="font-heading font-bold text-xl tracking-tight hidden sm:block">
                            Intent<span className="text-primary">Protocol</span>
                        </span>
                    </Link>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-primary",
                                location.pathname === item.path ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            {item.name}
                        </Link>
                    ))}

                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors focus:outline-none">
                            More <ChevronDown className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link to="/add-token" className="cursor-pointer w-full">Add New Token</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link to="/kb" className="cursor-pointer w-full">Knowledge Base</Link>
                            </DropdownMenuItem>
                            {/* Future "More" items can go here */}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </nav>

                {/* Actions */}
                <div className="hidden md:flex items-center gap-4">
                    <ModeToggle />
                    {connected && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    Deposit/Withdraw
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-[420px]">
                                <EscrowBalance className="w-full border shadow-sm" />
                            </DialogContent>
                        </Dialog>
                    )}
                    <ConnectWalletButton />
                </div>

                {/* Mobile Menu */}
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                        <div className="flex flex-col gap-8 mt-8">
                            <nav className="flex flex-col gap-4">
                                {[
                                    ...navItems,
                                    { name: 'Add New Token', path: '/add-token' },
                                    { name: 'Knowledge Base', path: '/kb' }
                                ].map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setIsOpen(false)}
                                        className={cn(
                                            "text-lg font-medium transition-colors hover:text-primary",
                                            location.pathname === item.path ? "text-primary" : "text-muted-foreground"
                                        )}
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </nav>
                            <div className="pt-4 border-t flex flex-col gap-4">
                                {connected && (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full">
                                                Deposit/Withdraw
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-[420px]">
                                            <EscrowBalance className="w-full border shadow-sm" />
                                        </DialogContent>
                                    </Dialog>
                                )}
                                <ConnectWalletButton />
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </header>
    );
}
