
import { useSearchParams, Link } from 'react-router-dom';
import { KBArticleList } from '../components/knowledge-base/KBArticleList';
import { kbService } from '../components/knowledge-base/kbService';
import { ChevronRight, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';

export function KBSearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const [searchTerm, setSearchTerm] = useState(query);

    // Sync local state with URL param
    useEffect(() => {
        setSearchTerm(query);
    }, [query]);

    const articles = kbService.searchArticles(query);

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            setSearchParams({ q: searchTerm.trim() });
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20 relative overflow-x-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Header Region */}
            <div className="pt-32 pb-12 px-4 relative z-10">
                <div className="container mx-auto max-w-6xl">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
                        <Link to="/home" className="hover:text-primary transition-colors"><Home className="h-4 w-4" /></Link>
                        <ChevronRight className="h-4 w-4 opacity-50" />
                        <Link to="/kb" className="hover:text-primary transition-colors">Knowledge Base</Link>
                        <ChevronRight className="h-4 w-4 opacity-50" />
                        <span className="text-foreground font-medium">Search Results</span>
                    </div>

                    <div className="max-w-3xl">
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
                            {query ? `Results for "${query}"` : 'Search Knowledge Base'}
                        </h1>

                        <div className="relative mb-12">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Search again..."
                                className="pl-12 h-14 text-lg bg-background/50 backdrop-blur-md border-border/50 shadow-lg rounded-2xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearch}
                            />
                        </div>

                        {query && (
                            <div className="flex items-center gap-2 mb-8">
                                <span className="w-2 h-2 rounded-full bg-primary" />
                                <span className="font-medium text-lg">{articles.length} {articles.length === 1 ? 'result' : 'results'} found</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="container mx-auto max-w-6xl px-4 relative z-20">
                <div className="min-h-[400px]">
                    {articles.length > 0 ? (
                        <KBArticleList articles={articles} />
                    ) : (
                        <div className="text-center py-20 border border-dashed border-border/50 rounded-3xl bg-card/30">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6 text-muted-foreground">
                                <Search className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">No results found</h3>
                            <p className="text-muted-foreground max-w-md mx-auto mb-8">
                                We couldn't find any articles matching "{query}". Try different keywords or browse by category.
                            </p>
                            <Link to="/kb">
                                <Button variant="outline">Browse All Articles</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
