
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function KBHeader() {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && query.trim()) {
            navigate(`/kb/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    return (
        <div className="relative text-center space-y-4 pt-32 pb-20 overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 px-4">
                <div className="flex justify-center mb-6">
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20 backdrop-blur-sm">
                        Knowledge Hub
                    </span>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
                    How can we help?
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 font-light leading-relaxed">
                    Master Intent Protocol with our comprehensive guides, technical documentation, and trading strategies.
                </p>

                <div className="max-w-2xl mx-auto relative group">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Search for articles, guides, or troubleshooting..."
                            className="pl-12 h-14 text-lg bg-background/50 backdrop-blur-md border-border/50 shadow-2xl rounded-2xl transition-all focus:bg-background focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1">
                            <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted">Enter</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
