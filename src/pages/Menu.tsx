import { useEffect, useState } from "react";
import { getItems, ItemDto } from "../services/itemService";
import { getCategoriesByType, CategoryDto } from "../services/categoryService";
import { STATUS_ENABLED } from "../services/statuses";
import Loader from "../components/ui/Loader";

export default function Menu() {
    const [items, setItems] = useState<ItemDto[]>([]);
    const [categories, setCategories] = useState<CategoryDto[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // Load categories
        getCategoriesByType("item", 1, 100)
            .then((res) => {
                if (!mounted) return;
                setCategories(res.data || []);
            })
            .catch(() => {
                /* ignore */
            });

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        setLoading(true);

        // Load all enabled items (large page size to get all)
        getItems(1, 1000, selectedCategory)
            .then((res) => {
                if (!mounted) return;
                // Filter only enabled items
                const enabledItems = (res.data || []).filter(
                    (item) => item.statusId === STATUS_ENABLED
                );
                setItems(enabledItems);
            })
            .catch(() => {
                /* ignore */
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [selectedCategory]);

    const resolveImageUrl = (path?: string | null) => {
        if (!path) return "/images/image-placeholder.svg";
        try {
            const url = new URL(path);
            return url.toString();
        } catch {
            const base =
                (import.meta.env.VITE_API_IMAGE_BASE_URL as string) || "";
            if (base) {
                return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
            }
            return path;
        }
    };

    const filteredItems = selectedCategory
        ? items.filter((item) => item.categoryId === selectedCategory)
        : items;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Our Menu
                    </h1>
                    <div className="w-20 h-1 mx-auto" style={{ backgroundColor: '#5D3FD3' }}></div>
                </div>

                {/* Category Tabs */}
                <div className="flex justify-center gap-3 mb-12 flex-wrap">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-6 py-2 rounded-lg font-medium transition ${selectedCategory === null
                            ? "text-white shadow-md"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                        style={selectedCategory === null ? { backgroundColor: '#5D3FD3' } : { backgroundColor: 'white' }}
                    >
                        All
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-6 py-2 rounded-lg font-medium transition ${selectedCategory === cat.id
                                ? "text-white shadow-md"
                                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                            style={selectedCategory === cat.id ? { backgroundColor: '#5D3FD3' } : {}}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center py-20">
                        <Loader />
                    </div>
                )}

                {/* Items Grid */}
                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
                            >
                                {/* Item Image */}
                                <div className="relative h-64 overflow-hidden">
                                    <img
                                        src={resolveImageUrl(item.imagePath)}
                                        alt={item.name}
                                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src =
                                                "/images/image-placeholder.svg";
                                        }}
                                    />
                                    {/* Purple border overlay */}
                                    <div className="absolute inset-0 border-4 pointer-events-none" style={{ borderColor: '#E6E6FA' }}></div>
                                </div>

                                {/* Item Info */}
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                            {item.name}
                                        </h3>
                                        <span className="text-xl font-bold" style={{ color: '#5D3FD3' }}>
                                            ${item.price.toFixed(2)}
                                        </span>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-3"></div>

                                    {/* Additional Info */}
                                    <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                                        <span className="capitalize">{item.type}</span>
                                        {item.quantity > 0 && (
                                            <span className="text-green-600 dark:text-green-500">
                                                In Stock
                                            </span>
                                        )}
                                        {item.quantity === 0 && (
                                            <span className="text-red-600 dark:text-red-500">
                                                Out of Stock
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredItems.length === 0 && (
                    <div className="text-center py-20">
                        <div className="text-gray-400 dark:text-gray-500 mb-4">
                            <svg
                                className="w-16 h-16 mx-auto"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-400">
                            No items available in this category
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
