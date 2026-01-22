import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSwap } from '../../../context/SwapContext';
import { TOKENS, TokenSelector } from '../forms/TokenSelector';
import { Token } from '@/types';

import { cn } from '@/lib/utils';

interface EscrowBalanceProps {
    className?: string;
}

export function EscrowBalance({ className }: EscrowBalanceProps) {
    const { escrowBalance, depositToEscrow, withdrawFromEscrow, isLoading, refreshBalance } = useSwap();
    const [depositAmount, setDepositAmount] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [selectedToken, setSelectedToken] = useState<Token>(TOKENS[0]); // Default to MOVE

    const handleDeposit = async () => {
        try {
            await depositToEscrow(parseFloat(depositAmount), selectedToken.type, selectedToken.decimals);
            setDepositAmount("");
            toast.success("Deposit Successful!", {
                description: `Successfully deposited ${depositAmount} ${selectedToken.symbol} to escrow.`
            });
        } catch (e: any) {
            toast.error("Deposit Failed", {
                description: e.message || "An unexpected error occurred."
            });
        }
    };

    const handleWithdraw = async () => {
        try {
            await withdrawFromEscrow(parseFloat(withdrawAmount), selectedToken.type, selectedToken.decimals);
            setWithdrawAmount("");
            // Toast handled in context for consistency, but good to have local feedback clear
        } catch (e: any) {
            // Error toast handled in context
        }
    };

    const currentBalance = escrowBalance[selectedToken.type] || 0;

    return (
        <Card className={cn("w-[400px]", className)}>
            <CardHeader>
                <CardTitle>Escrow Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Balance List */}
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Your Balances</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {TOKENS.map((token) => (
                            <div key={token.symbol}
                                className={cn(
                                    "flex items-center justify-between bg-muted/30 p-2 rounded-lg cursor-pointer transition-colors border border-transparent",
                                    selectedToken.symbol === token.symbol ? "border-primary/50 bg-primary/5" : "hover:bg-muted/50"
                                )}
                                onClick={() => setSelectedToken(token)}
                            >
                                <div className="flex items-center gap-2">
                                    <img src={token.icon} alt={token.symbol} className="w-5 h-5 rounded-full" />
                                    <span className="text-sm font-semibold">{token.symbol}</span>
                                </div>
                                <span className="text-sm font-mono">
                                    {(escrowBalance[token.type] || 0).toFixed(token.decimals === 8 ? 4 : 2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <Tabs defaultValue="deposit" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="deposit">Deposit</TabsTrigger>
                        <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                    </TabsList>

                    <TabsContent value="deposit" className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount to Deposit</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="Amount"
                                    value={depositAmount}
                                    onChange={e => setDepositAmount(e.target.value)}
                                    className="flex-1"
                                />
                                <div className="flex items-center justify-center px-3 bg-muted rounded-md text-sm font-semibold min-w-[60px]">
                                    {selectedToken.symbol}
                                </div>
                            </div>
                            <Button onClick={handleDeposit} disabled={isLoading || !depositAmount || parseFloat(depositAmount) <= 0} className="w-full">
                                {isLoading ? "Processing..." : `Deposit ${selectedToken.symbol}`}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="withdraw" className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium">Amount to Withdraw</label>
                                <span className="text-xs text-muted-foreground">Max: {currentBalance.toFixed(4)}</span>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="Amount"
                                    value={withdrawAmount}
                                    onChange={e => setWithdrawAmount(e.target.value)}
                                    className="flex-1"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setWithdrawAmount(currentBalance.toString())}
                                    className="px-2"
                                >
                                    Max
                                </Button>
                            </div>
                            <Button onClick={handleWithdraw} disabled={isLoading || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > currentBalance} variant="destructive" className="w-full">
                                {isLoading ? "Processing..." : `Withdraw ${selectedToken.symbol}`}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter>
                <Button variant="ghost" size="sm" onClick={refreshBalance} className="w-full text-xs text-muted-foreground">
                    Refresh Balances
                </Button>
            </CardFooter>
        </Card>
    );
}
