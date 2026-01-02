import { ModeToggle } from "@/components/mode-toggle"
import { useLanguage } from "@/context/language-provider"
import { useWallet } from "@/context/wallet-provider"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom"
import { SwapProvider } from "./context/SwapContext"
import { OraclePage } from "./pages/OraclePage"
import SwapPage from "./pages/SwapPage"
import OrdersPage from "./pages/OrdersPage"
import { ResolverPage } from "./pages/ResolverPage"

function App() {
    const { language, setLanguage } = useLanguage();
    const { connected, account, network } = useWallet();

    return (
        <Router>
            <div className="flex min-h-screen flex-col items-center p-8 gap-8">
                {/* Header / Nav */}
                <div className="w-full flex justify-between items-center max-w-6xl">
                    <div className="flex gap-4 items-center">
                        <h1 className="text-xl font-bold">Intent Protocol</h1>
                        <nav className="flex gap-4">
                            <Link to="/"><Button variant="ghost">Home</Button></Link>
                            <Link to="/swap"><Button variant="ghost">Swap</Button></Link>
                            <Link to="/orders"><Button variant="ghost">Orders</Button></Link>
                            <Link to="/resolver"><Button variant="ghost" className="text-purple-500">Resolver</Button></Link>
                            <Link to="/oracle"><Button variant="ghost">Oracles</Button></Link>
                        </nav>
                    </div>
                    <div className="flex gap-4 items-center">
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as any)}
                            className="p-2 border rounded-md bg-background text-foreground"
                        >
                            <option value="en">English</option>
                            <option value="es">Español</option>
                            <option value="fr">Français</option>
                        </select>
                        <ModeToggle />
                        <ConnectWalletButton />
                    </div>
                </div>

                <SwapProvider>
                    <Routes>
                        <Route path="/" element={
                            <Card className="w-[400px]">
                                <CardHeader>
                                    <CardTitle>Intent Protocol</CardTitle>
                                    <CardDescription>Cross-chain Intent Protocol Frontend</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p>Current Language: {language}</p>

                                    {connected && account ? (
                                        <div className="p-4 bg-muted rounded-lg space-y-2">
                                            <p className="text-sm font-medium">Connected Wallet</p>
                                            <p className="text-xs font-mono break-all">{account.address.toString()}</p>
                                            {network && (
                                                <p className="text-xs text-muted-foreground">
                                                    Network: {network.name} (Chain ID: {network.chainId})
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-muted/50 rounded-lg text-center">
                                            <p className="text-sm text-muted-foreground">
                                                Connect your wallet to get started
                                            </p>
                                        </div>
                                    )}
                                    <Link to="/swap">
                                        <Button className="w-full mt-4">Go to Swap App</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        } />
                        <Route path="/swap" element={<SwapPage />} />
                        <Route path="/orders" element={<OrdersPage />} />
                        <Route path="/resolver" element={<ResolverPage />} />
                        <Route path="/oracle" element={<OraclePage />} />
                    </Routes>
                </SwapProvider>
            </div>
        </Router>
    )
}

export default App
