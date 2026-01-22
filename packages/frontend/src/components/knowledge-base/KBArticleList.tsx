
import { KBArticleCard } from './KBArticleCard';
import { kbService } from './kbService';

interface KBArticleListProps {
    categoryId?: string;
    limit?: number;
    articles?: any[]; // Using any to avoid importing the type if not needed or importing KBArticle from service
}

export function KBArticleList({ categoryId, limit, articles: propArticles }: KBArticleListProps) {
    let articles = propArticles || (categoryId
        ? kbService.getArticlesByCategory(categoryId)
        : kbService.getAllArticles());

    if (limit) {
        articles = articles.slice(0, limit);
    }

    if (articles.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No articles found in this category.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
                <KBArticleCard
                    key={article.id}
                    {...article}
                />
            ))}
        </div>
    );
}
