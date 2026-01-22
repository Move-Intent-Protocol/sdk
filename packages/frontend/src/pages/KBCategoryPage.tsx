
import { useParams, Link } from 'react-router-dom';
import { KBArticleList } from '../components/knowledge-base/KBArticleList';
import { kbService } from '../components/knowledge-base/kbService';
import { ChevronRight, Home, LayoutGrid, List } from 'lucide-react';

export function KBCategoryPage() {
    const { categoryId } = useParams();
    const category = categoryId ? kbService.getCategory(categoryId) : undefined;

    if (!category) {
        return <div className="p-20 text-center">Category not found</div>;
    }

    return (
        <div className="min-h-screen bg-background pb-20 relative overflow-x-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Hero Header Region */}
            <div className="pt-32 pb-12 px-4 relative z-10">
                <div className="container mx-auto max-w-6xl">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
                        <Link to="/home" className="hover:text-primary transition-colors"><Home className="h-4 w-4" /></Link>
                        <ChevronRight className="h-4 w-4 opacity-50" />
                        <Link to="/kb" className="hover:text-primary transition-colors">Knowledge Base</Link>
                        <ChevronRight className="h-4 w-4 opacity-50" />
                        <span className="text-foreground font-medium">{category.title}</span>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8 mb-16">
                        <div className="flex items-start gap-6">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary shadow-2xl backdrop-blur-sm">
                                <span className="text-4xl font-bold">{category.title.charAt(0)}</span>
                            </div>
                            <div className="space-y-4">
                                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{category.title}</h1>
                                <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
                                    {category.description}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-card/50 backdrop-blur-md p-1.5 rounded-xl border border-border/50">
                            <div className="p-2.5 rounded-lg bg-primary/10 text-primary cursor-pointer"><LayoutGrid className="h-5 w-5" /></div>
                            <div className="p-2.5 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer transition-colors"><List className="h-5 w-5" /></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto max-w-6xl px-4 relative z-20">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/40">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {category.articleCount} Articles Available
                    </h2>
                </div>

                <div className="min-h-[400px]">
                    <KBArticleList categoryId={categoryId} />
                </div>
            </div>
        </div>
    );
}
