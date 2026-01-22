
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface KBArticleCardProps {
    id: string;
    categoryId: string;
    title: string;
    summary: string;
    date: string;
    author: string;
    readTime: string;
    tags: string[];
}

export function KBArticleCard({ id, categoryId, title, summary, date, author, readTime, tags }: KBArticleCardProps) {
    return (
        <Link to={`/kb/${categoryId}/${id}`} className="block h-full group">
            <Card className="h-full overflow-hidden bg-card/50 border-border/50 hover:border-primary/50 transition-all hover:bg-card/80 flex flex-col">
                <div className="aspect-video w-full overflow-hidden bg-muted/20 relative">
                    {/* Placeholder for the image - using the sample generated one */}
                    <img
                        src="/images/kb/sample_article.png"
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent opacity-60" />
                </div>
                <CardHeader className="p-5 pb-2">
                    <h3 className="font-bold text-xl leading-tight group-hover:text-primary transition-colors">
                        {title}
                    </h3>
                </CardHeader>
                <CardContent className="p-5 py-2 flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                        {summary}
                    </p>
                </CardContent>
                <CardFooter className="p-5 pt-2 flex flex-col items-start gap-4">
                    <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px] uppercase tracking-wider h-5">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground w-full pt-4 border-t border-border/50">
                        <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{readTime}</span>
                        </div>
                        <div className="ml-auto text-primary group-hover:translate-x-1 transition-transform">
                            Read more →
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </Link>
    );
}
