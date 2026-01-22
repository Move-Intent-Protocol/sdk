import { Toaster } from "@/components/ui/sonner"
import { useLanguage } from "@/context/language-provider"
import { useWallet } from "@/context/wallet-provider"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { SwapProvider } from "./context/SwapContext"
import { OraclePage } from "./pages/OraclePage"
import SwapPage from "./pages/SwapPage"
import OrdersPage from "./pages/OrdersPage"
import LandingPage from "./pages/LandingPage"
import { Header } from "./components/common/Header"
import { Footer } from "./components/common/Footer"
import { ResolverPage } from "./pages/ResolverPage"
import CrossChainPage from "./pages/CrossChainPage"
import ProPage from "./pages/ProPage"

import TermsOfService from '@/pages/TermsOfService';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import { KnowledgeBasePage } from "./pages/KnowledgeBasePage"
import { KBCategoryPage } from "./pages/KBCategoryPage"
import { KBArticlePage } from "./pages/KBArticlePage"
import { KBSearchPage } from "./pages/KBSearchPage"
import { AddTokenPage } from "./pages/AddTokenPage"

function App() {
    useLanguage();
    useWallet();

    return (
        <Router>
            <div className="flex min-h-screen flex-col bg-background font-sans antialiased">
                <SwapProvider>
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/home" element={<LandingPage />} />
                        <Route path="/swap" element={
                            <div className="flex flex-col min-h-screen">
                                <Header />
                                <main className="flex-1 container mx-auto p-8 mt-20">
                                    <SwapPage />
                                </main>
                                <Footer />
                            </div>
                        } />
                        <Route path="/orders" element={
                            <div className="flex flex-col min-h-screen">
                                <Header />
                                <main className="flex-1 container mx-auto p-8 mt-20">
                                    <OrdersPage />
                                </main>
                                <Footer />
                            </div>
                        } />
                        <Route path="/resolver" element={
                            <div className="flex flex-col min-h-screen">
                                <Header />
                                <main className="flex-1 container mx-auto p-8 mt-20">
                                    <ResolverPage />
                                </main>
                                <Footer />
                            </div>
                        } />
                        <Route path="/oracle" element={
                            <div className="flex flex-col min-h-screen">
                                <Header />
                                <main className="flex-1 container mx-auto p-8 mt-20">
                                    <OraclePage />
                                </main>
                                <Footer />
                            </div>
                        } />
                        <Route path="/cross-chain" element={
                            <div className="flex flex-col min-h-screen">
                                <Header />
                                <CrossChainPage />
                                <Footer />
                            </div>
                        } />
                        <Route path="/pro" element={
                            <div className="flex flex-col min-h-screen">
                                <Header />
                                <ProPage />
                                <Footer />
                            </div>
                        } />

                        <Route path="/terms" element={<TermsOfService />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />


                        <Route path="/add-token" element={
                            <div className="flex flex-col min-h-screen">
                                <Header />
                                <main className="flex-1 container mx-auto p-8 mt-20">
                                    <AddTokenPage />
                                </main>
                                <Footer />
                            </div>
                        } />

                        {/* Knowledge Base Routes */}
                        <Route path="/kb" element={
                            <div className="flex flex-col min-h-screen">
                                <Header />
                                <KnowledgeBasePage />
                                <Footer />
                            </div>
                        } />
                        <Route path="/kb/search" element={
                            <div className="flex flex-col min-h-screen">
                                <Header />
                                <KBSearchPage />
                                <Footer />
                            </div>
                        } />
                        <Route path="/kb/:categoryId" element={
                            <div className="flex flex-col min-h-screen">
                                <Header />
                                <KBCategoryPage />
                                <Footer />
                            </div>
                        } />
                        <Route path="/kb/:categoryId/:articleId" element={
                            <div className="flex flex-col min-h-screen">
                                <Header />
                                <KBArticlePage />
                                <Footer />
                            </div>
                        } />
                    </Routes>
                </SwapProvider>
            </div>
            <Toaster />
        </Router>
    )
}

export default App
