
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { BookOpen, FileText, GitCommit, AlertCircle, Lightbulb, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';

const iconMap: Record<string, any> = {
    'book-open': BookOpen,
    'file-text': FileText,
    'git-commit': GitCommit,
    'alert-circle': AlertCircle,
    'lightbulb': Lightbulb,
    'newspaper': Newspaper,
};

interface KBCategoryCardProps {
    id: string;
    title: string;
    description: string;
    articleCount: number;
    icon: string;
}

export function KBCategoryCard({ id, title, description, articleCount, icon }: KBCategoryCardProps) {
    const Icon = iconMap[icon] || FileText;

    return (
        <Link to={`/kb/${id}`} className="block h-full group">
            <Card className="h-full bg-card/50 border-border/50 hover:border-primary/50 transition-all hover:bg-card/80">
                <CardHeader className="space-y-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {description}
                    </p>
                </CardContent>
                <CardFooter>
                    <p className="text-xs font-medium text-primary">
                        {articleCount} articles
                    </p>
                </CardFooter>
            </Card>
        </Link>
    );
}
