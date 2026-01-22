import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Info, Search, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from 'react-router-dom';

export function AddTokenPage() {
    const [address, setAddress] = useState("");

    const handleAddToken = () => {
        if (!address) {
            toast.error("Please enter a token address");
            return;
        }
        toast.info("Feature Coming Soon!", {
            description: "We are working on implementing custom token additions."
        });
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link to="/swap" className="text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Add New Token</h1>
            </div>

            {/* How to Guide */}
            <Card className="bg-muted/30 border-primary/10">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-primary">
                        <Info className="h-5 w-5" />
                        How to Add a Token
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">1</div>
                        <p className="pt-0.5">Enter the contract address of the FA/Coin you want to add.</p>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">2</div>
                        <p className="pt-0.5">We'll automatically fetch the token metadata and show a preview.</p>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">3</div>
                        <p className="pt-0.5">Review the token details and click "Add Token" to confirm.</p>
                    </div>
                </CardContent>
            </Card>

            {/* Input Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="h-5 w-5 text-muted-foreground" />
                        Enter Token Address
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        placeholder="e.g. 0x1::aptos_coin::AptosCoin"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="h-12 text-lg"
                    />
                </CardContent>
            </Card>

            {/* Search/Preview Placeholder */}
            <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground bg-muted/10">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter a token address above to preview details</p>
            </div>

            {/* Wallet Warning (Static for now as per design) */}
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                    <h4 className="text-sm font-medium text-orange-500">Wallet Connection Required</h4>
                    <p className="text-xs text-orange-500/80">
                        Please connect your wallet to add tokens to your personal list.
                    </p>
                </div>
            </div>

            {/* Action Button */}
            <Button size="lg" className="w-full text-lg h-12" onClick={handleAddToken}>
                Add Token
            </Button>
        </div>
    );
}
