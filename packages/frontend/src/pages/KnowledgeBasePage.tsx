
import { KBHeader } from '../components/knowledge-base/KBHeader';
import { KBCategoryList } from '../components/knowledge-base/KBCategoryList';
import { KBArticleList } from '../components/knowledge-base/KBArticleList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function KnowledgeBasePage() {
    return (
        <div className="min-h-screen bg-background pb-20 relative overflow-x-hidden">
            <KBHeader />

            <div className="container mx-auto px-4 -mt-20 relative z-20">
                <div className="bg-background/10 backdrop-blur-3xl rounded-3xl p-8 border border-white/5 shadow-2xl ring-1 ring-white/10">
                    <KBCategoryList />
                </div>
            </div>

            <div className="container mx-auto px-4 mt-32 max-w-6xl">
                <div className="flex items-center justify-between mb-12">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-bold tracking-tight">Recent Articles</h2>
                        <p className="text-muted-foreground">Latest updates and guides from the team.</p>
                    </div>
                    <Button variant="outline" className="rounded-full">
                        View all articles
                    </Button>
                </div>

                <div className="min-h-[200px]">
                    <KBArticleList limit={3} />
                </div>
            </div>

            <div className="container mx-auto px-4 mt-32 mb-20">
                <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-border/50 text-center max-w-4xl mx-auto overflow-hidden relative group">
                    <div className="absolute inset-0 bg-primary/5 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                    <CardContent className="p-12 md:p-16 relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8 text-primary border border-primary/20 shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                        </div>
                        <h3 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Stay ahead of the curve</h3>
                        <p className="text-xl text-muted-foreground mb-10 max-w-lg mx-auto leading-relaxed">
                            Join 50,000+ traders getting weekly alpha, protocol updates, and trading strategies.
                        </p>
                        <div className="flex flex-col sm:flex-row max-w-md mx-auto gap-3">
                            <input type="email" placeholder="Enter your email address" className="flex h-12 w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-background/80" />
                            <Button size="lg" className="rounded-xl h-12 px-8 text-base shadow-lg shadow-primary/20">Subscribe</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
