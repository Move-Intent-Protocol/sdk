
import { KBCategoryCard } from './KBCategoryCard';
import { kbService } from './kbService';

export function KBCategoryList() {
    const categories = kbService.getCategories();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
                <KBCategoryCard
                    key={category.id}
                    {...category}
                />
            ))}
        </div>
    );
}
