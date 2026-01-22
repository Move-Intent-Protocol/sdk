
import categories from './data/categories.json';

// Type definitions
export interface KBArticle {
    id: string;
    categoryId: string;
    title: string;
    summary: string;
    content: string; // Markdown content
    date: string;
    author: string;
    readTime: string;
    tags: string[];
}

export interface KBCategory {
    id: string;
    title: string;
    description: string;
    articleCount: number;
    icon: string;
}

// Helper to parse simple Frontmatter
const parseFrontmatter = (fileContent: string): KBArticle => {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = fileContent.match(frontmatterRegex);

    if (!match) {
        throw new Error('Invalid Markdown file format: Missing Frontmatter');
    }

    const [, frontmatterBlock, content] = match;
    const metadata: any = {};

    frontmatterBlock.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
            const value = valueParts.join(':').trim();
            // Handle array for tags
            if (key.trim() === 'tags') {
                metadata[key.trim()] = value.replace(/[\[\]]/g, '').split(',').map(t => t.trim().replace(/^"|"$/g, ''));
            } else {
                // Remove quotes if present
                metadata[key.trim()] = value.replace(/^"|"$/g, '');
            }
        }
    });

    return {
        ...metadata,
        content: content.trim()
    } as KBArticle;
};

// Load all articles eagerly using Vite's glob import as raw strings
const articleModules = import.meta.glob('./data/articles/*.md', { query: '?raw', import: 'default', eager: true });

// Parse and convert modules to KBArticle array
const articles: KBArticle[] = Object.values(articleModules).map((content: any) => {
    try {
        return parseFrontmatter(content);
    } catch (e) {
        console.error("Failed to parse article:", e);
        return null;
    }
}).filter(Boolean) as KBArticle[];

export const kbService = {
    getCategories: (): KBCategory[] => {
        return categories;
    },

    getCategory: (id: string): KBCategory | undefined => {
        return categories.find(c => c.id === id);
    },

    getAllArticles: (): KBArticle[] => {
        return articles;
    },

    getArticlesByCategory: (categoryId: string): KBArticle[] => {
        return articles.filter(a => a.categoryId === categoryId);
    },

    getArticleById: (id: string): KBArticle | undefined => {
        return articles.find(a => a.id === id);
    },

    searchArticles: (query: string): KBArticle[] => {
        const lowerQuery = query.toLowerCase();
        return articles.filter(a =>
            a.title.toLowerCase().includes(lowerQuery) ||
            a.summary.toLowerCase().includes(lowerQuery) ||
            a.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
            a.content.toLowerCase().includes(lowerQuery)
        );
    }
};
