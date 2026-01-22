
import { useParams, Link } from 'react-router-dom';
import { kbService } from '../components/knowledge-base/kbService';
import { ChevronRight, Home, Calendar, User, Clock, Share2, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export function KBArticlePage() {
    const { articleId, categoryId } = useParams();
    const article = articleId ? kbService.getArticleById(articleId) : undefined;
    // Find category from ID or from article data
    const category = categoryId ? kbService.getCategory(categoryId) : undefined;

    if (!article) {
        return <div className="p-20 text-center">Article not found</div>;
    }

    return (
        <div className="min-h-screen bg-background pb-20 relative overflow-x-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Hero Header */}
            <div className="relative pt-32 pb-12 px-4">
                <div className="container mx-auto max-w-5xl">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8 overflow-x-auto whitespace-nowrap">
                        <Link to="/home" className="hover:text-primary transition-colors flex-shrink-0"><Home className="h-4 w-4" /></Link>
                        <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-50" />
                        <Link to="/kb" className="hover:text-primary transition-colors">Knowledge Base</Link>
                        {category && (
                            <>
                                <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-50" />
                                <Link to={`/kb/${category.id}`} className="hover:text-primary transition-colors">{category.title}</Link>
                            </>
                        )}
                        <ChevronRight className="h-4 w-4 flex-shrink-0 opacity-50" />
                        <span className="text-foreground font-medium truncate opacity-80">{article.title}</span>
                    </div>

                    <div className="grid md:grid-cols-[1fr_auto] gap-8 items-start">
                        <div className="space-y-6">
                            <div className="flex flex-wrap gap-3">
                                <Badge variant="outline" className="border-primary/50 text-primary bg-primary/5 px-3 py-1 text-xs uppercase tracking-wider">
                                    {category?.title || 'Article'}
                                </Badge>
                                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    {article.readTime}
                                </span>
                            </div>

                            <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                {article.title}
                            </h1>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium text-foreground">{article.author}</span>
                                </div>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>{article.date}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto max-w-5xl px-4">
                {/* Main Content Area */}
                <div className="max-w-4xl mx-auto">

                    <div className="min-w-0 space-y-8">
                        {/* Featured Image */}
                        <div className="w-full aspect-[21/9] rounded-3xl overflow-hidden border border-border/40 shadow-2xl relative group">
                            <img
                                src="/images/kb/sample_article.png"
                                alt={article.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
                        </div>

                        {/* Summary Card */}
                        <div className="bg-secondary/30 border border-border/50 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-primary/20 rounded-lg text-primary mt-1">
                                    <MessageSquare className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg mb-2">Key Takeaways</h4>
                                    <p className="text-muted-foreground leading-relaxed">{article.summary}</p>
                                </div>
                            </div>
                        </div>

                        {/* Markdown Content */}
                        <div className="prose prose-invert prose-lg max-w-none">
                            <Markdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: ({ node, ...props }) => <h1 className="text-4xl font-bold tracking-tight mt-12 mb-6 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="text-2xl font-bold tracking-tight mt-10 mb-4 border-b border-border/40 pb-2" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-xl font-bold tracking-tight mt-8 mb-3 text-primary/90" {...props} />,
                                    p: ({ node, ...props }) => <p className="leading-8 text-muted-foreground mb-6" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-6 space-y-2 mb-6 text-muted-foreground" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-6 space-y-2 mb-6 text-muted-foreground" {...props} />,
                                    li: ({ node, ...props }) => <li className="pl-2" {...props} />,
                                    a: ({ node, ...props }) => (
                                        <a className="text-primary font-medium underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-all" {...props} />
                                    ),
                                    blockquote: ({ node, ...props }) => (
                                        <blockquote className="border-l-4 border-primary bg-primary/5 rounded-r-lg py-4 px-6 my-8 italic text-lg text-foreground/80 not-italic" {...props} />
                                    ),
                                    code: ({ node, className, children, ...props }: any) => {
                                        const match = /language-(\w+)/.exec(className || '')
                                        return match ? (
                                            <div className="rounded-xl overflow-hidden my-6 border border-border/50 shadow-2xl">
                                                <div className="bg-muted/50 px-4 py-2 text-xs text-muted-foreground border-b border-border/50 flex justify-between items-center">
                                                    <span>{match[1]}</span>
                                                    <span className="opacity-50">Copy</span>
                                                </div>
                                                <SyntaxHighlighter
                                                    {...props}
                                                    style={vscDarkPlus}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    customStyle={{ margin: 0, padding: '1.5rem', background: 'rgba(0,0,0,0.5)', fontSize: '0.9rem' }}
                                                >
                                                    {String(children).replace(/\n$/, '')}
                                                </SyntaxHighlighter>
                                            </div>
                                        ) : (
                                            <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono text-sm" {...props}>
                                                {children}
                                            </code>
                                        )
                                    },
                                    table: ({ node, ...props }) => (
                                        <div className="overflow-x-auto my-8 rounded-xl border border-border/50 shadow-sm">
                                            <table className="w-full text-left text-sm" {...props} />
                                        </div>
                                    ),
                                    thead: ({ node, ...props }) => <thead className="bg-muted/50 text-muted-foreground font-medium" {...props} />,
                                    th: ({ node, ...props }) => <th className="px-6 py-4 border-b border-border/50 font-bold tracking-wider uppercase text-xs" {...props} />,
                                    td: ({ node, ...props }) => <td className="px-6 py-4 border-b border-border/40 whitespace-nowrap text-muted-foreground" {...props} />,
                                    img: ({ node, ...props }) => <img className="rounded-xl border border-border/50 shadow-lg my-8 w-full" {...props} />,
                                    hr: ({ node, ...props }) => <hr className="my-12 border-border/40" {...props} />
                                }}
                            >
                                {article.content}
                            </Markdown>
                        </div>

                        {/* Article Footer */}
                        <div className="pt-10 border-t border-border/40 flex items-center justify-between">
                            <h4 className="font-medium text-muted-foreground">Was this article helpful?</h4>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="gap-2">👍 Yes</Button>
                                <Button variant="outline" size="sm" className="gap-2">👎 No</Button>
                            </div>
                        </div>

                        {/* Bottom Meta Section (Formerly Sidebar) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
                            {/* Share Card */}
                            <Card className="bg-card/50 border-border/50 backdrop-blur-xl shadow-lg h-full">
                                <CardHeader>
                                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Share</h4>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="icon" className="w-full rounded-xl hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-all"><Share2 className="h-4 w-4" /></Button>
                                        <Button variant="outline" size="icon" className="w-full rounded-xl hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-all"><svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg></Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Tags Card */}
                            <Card className="bg-card/50 border-border/50 backdrop-blur-xl shadow-lg h-full">
                                <CardHeader>
                                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Related Topics</h4>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {article.tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="px-3 py-1 bg-secondary/50 hover:bg-primary/20 hover:text-primary cursor-pointer transition-colors text-xs font-normal capitalize">
                                                #{tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Newsletter Mini-Card */}
                            <Card className="bg-gradient-to-br from-primary/20 via-card to-card border-border/50 text-center relative overflow-hidden h-full">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <MessageSquare className="w-24 h-24 rotate-12" />
                                </div>
                                <CardContent className="p-6 relative z-10 flex flex-col justify-center h-full">
                                    <h4 className="font-bold mb-1">Weekly Alpha</h4>
                                    <p className="text-xs text-muted-foreground mb-3">Get the latest intents and strategies.</p>
                                    <div className="space-y-2">
                                        <Input placeholder="Email" className="bg-background/50 h-9 text-xs" />
                                        <Button size="sm" className="w-full text-xs h-8">Subscribe</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Comments */}
                        <div className="pt-20">
                            <h3 className="text-2xl font-bold mb-6">Discussion</h3>
                            <Card className="bg-card/50 border-border/50 border-dashed backdrop-blur-sm">
                                <CardContent className="p-12 text-center space-y-4">
                                    <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                                        <MessageSquare className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Join the conversation</p>
                                        <p className="text-sm text-muted-foreground mt-1">Connect your wallet to share your thoughts.</p>
                                    </div>
                                    <Button className="mt-4">Connect Wallet</Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
