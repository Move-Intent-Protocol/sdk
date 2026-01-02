import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from '@/context/theme-provider'
import { LanguageProvider } from '@/context/language-provider'
import { WalletProvider } from '@/context/wallet-provider'
import { Toaster } from './components/ui/sonner'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <LanguageProvider>
                <WalletProvider>
                    <App />
                    <Toaster />
                </WalletProvider>
            </LanguageProvider>
        </ThemeProvider>
    </React.StrictMode>,
)
