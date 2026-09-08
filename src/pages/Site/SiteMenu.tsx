// Public café menu — live items from the inventory API, grouped by category.
import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { getItems, ItemDto } from "../../services/itemService";
import { getCategoriesByType, CategoryDto } from "../../services/categoryService";
import { IMAGES } from "./siteContent";
import { useSiteContent } from "./SiteContentContext";
import { ScrollCue } from "./SiteUi";
import { hideImageOnError, resolveSiteImage } from "./siteHelpers";

type ItemType = "Food" | "Retail" | "Drinks" | "Tobacco";

const TYPE_TABS: Array<{ type: ItemType; label: string }> = [
  { type: "Food", label: "🍔 Food" },
  { type: "Drinks", label: "🥤 Drinks" },
  { type: "Tobacco", label: "💨 Tobacco" },
  { type: "Retail", label: "🛒 Retail" },
];

const ACTIVE = "bg-gradient-to-r from-[#6a99cb] to-[#87b2dd] text-[#071018] shadow-2xl shadow-[#87b2dd]/45";
const INACTIVE = "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20";
const GRID = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4";

function resolveImageUrl(path?: string | null): string {
  if (!path) return IMAGES.placeholder;
  try {
    return new URL(path).toString();
  } catch {
    const base = (import.meta.env.VITE_API_IMAGE_BASE_URL as string) || "";
    return base ? `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}` : path;
  }
}

function matchesType(cat: CategoryDto | undefined, type: ItemType): boolean {
  if (!cat) return false;
  if (type === "Drinks") return cat.itemType === "Bar" || cat.itemType === "Drinks";
  return cat.itemType === type;
}

export default function SiteMenu() {
  const { menu: copy } = useSiteContent();
  const [items, setItems] = useState<ItemDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType>("Food");
  const [loading, setLoading] = useState(true);
  // Tapped item → detail sheet (description, add-ons, price). Add-ons are
  // hidden on the cards so the grid stays clean on phones.
  const [openItem, setOpenItem] = useState<ItemDto | null>(null);

  // Close the sheet with Escape and lock the page scroll behind it.
  useEffect(() => {
    if (!openItem) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenItem(null); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [openItem]);

  useEffect(() => {
    let mounted = true;
    getCategoriesByType("item", 1, 100)
      .then((res) => mounted && setCategories(res.data || []))
      .catch(() => {
        /* the menu still renders, just uncategorised */
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getItems(1, 1000, selectedCategory)
      .then((res) => {
        if (!mounted) return;
        setItems((res.data || []).filter((it) => it.statusId === 1));
      })
      .catch(() => {
        /* handled by the empty state */
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [selectedCategory]);

  const typeCategories = categories.filter((c) => matchesType(c, selectedType));
  const visibleItems = items.filter((it) => {
    const cat = categories.find((c) => c.id === it.categoryId);
    return matchesType(cat, selectedType) && (selectedCategory === null || it.categoryId === selectedCategory);
  });

  const sections = typeCategories
    .map((cat) => ({ id: cat.id, name: cat.name, items: visibleItems.filter((it) => it.categoryId === cat.id) }))
    .filter((s) => s.items.length > 0);
  const uncategorized = visibleItems.filter(
    (it) => it.categoryId === null || !typeCategories.some((c) => c.id === it.categoryId)
  );

  const pickType = (type: ItemType) => {
    setSelectedType(type);
    setSelectedCategory(null);
  };

  const renderCard = (item: ItemDto) => {
    const inStock = item.quantity > 0;
    const addOnCount = (item.addOns ?? []).filter((a) => a.isActive !== false).length;
    return (
      <button
        type="button"
        key={item.id}
        onClick={() => setOpenItem(item)}
        className="group relative text-left bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden border border-white/15 hover:bg-white/15 hover:border-[#87b2dd]/50 active:scale-[0.98] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#87b2dd]"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={resolveImageUrl(item.imagePath)}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.currentTarget.src = IMAGES.placeholder;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          {!inStock && (
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/90 text-white">
              Sold out
            </span>
          )}
          {addOnCount > 0 && (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/55 text-[#d8e8f8] backdrop-blur-sm">
              ✚ {addOnCount} extra{addOnCount > 1 ? "s" : ""}
            </span>
          )}
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg text-sm font-bold bg-white/95 text-[#071018] shadow">
            ${item.price.toFixed(2)}
          </span>
        </div>
        <div className="px-3 py-2.5 flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-bold text-white leading-tight line-clamp-2">{item.name}</h3>
          <span className="shrink-0 text-[#b9d3ee] text-lg leading-none">›</span>
        </div>
      </button>
    );
  };

  const renderDetail = () => {
    if (!openItem) return null;
    const item = openItem;
    const inStock = item.quantity > 0;
    const addOns = (item.addOns ?? []).filter((a) => a.isActive !== false);
    const cat = categories.find((c) => c.id === item.categoryId);
    return (
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpenItem(null)} />
        <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-[#0e1a2a] text-white rounded-t-3xl sm:rounded-3xl border border-white/15 shadow-2xl animate-[slideUp_.25s_ease-out]">
          <div className="relative aspect-[16/10] sm:aspect-[16/9]">
            <img
              src={resolveImageUrl(item.imagePath)}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = IMAGES.placeholder;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e1a2a] via-transparent to-black/30" />
            <button
              type="button"
              onClick={() => setOpenItem(null)}
              aria-label="Close"
              className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/60 text-white text-lg flex items-center justify-center hover:bg-black/80"
            >
              ✕
            </button>
            <div className="absolute top-3 left-1/2 -translate-x-1/2 h-1.5 w-12 rounded-full bg-white/50 sm:hidden" />
          </div>

          <div className="px-5 pb-6 -mt-6 relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {cat && <div className="text-[11px] uppercase tracking-[0.2em] text-[#b9d3ee] mb-1">{cat.name}</div>}
                <h3 className="text-2xl font-bold leading-tight">{item.name}</h3>
              </div>
              <div className="shrink-0 text-2xl font-bold text-[#b9d3ee]">${item.price.toFixed(2)}</div>
            </div>

            {item.type && (
              <p className="mt-3 text-sm text-gray-300 leading-relaxed">{item.type}</p>
            )}

            <div className="mt-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${inStock ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-green-400" : "bg-red-400"}`} />
                {inStock ? "Available now" : "Sold out today"}
              </span>
            </div>

            {addOns.length > 0 && (
              <div className="mt-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b9d3ee] mb-2">Make it yours</div>
                <div className="rounded-2xl border border-white/10 divide-y divide-white/10 overflow-hidden bg-white/5">
                  {addOns.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-medium">{a.name}</span>
                      <span className="text-sm font-bold text-[#b9d3ee]">+${a.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-gray-400">Ask at the counter when you order.</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpenItem(null)}
              className="mt-6 w-full h-12 rounded-2xl font-bold text-[#071018] bg-gradient-to-r from-[#6a99cb] to-[#87b2dd] active:scale-[0.98] transition"
            >
              Back to menu
            </button>
          </div>
        </div>
        <style>{`@keyframes slideUp{from{transform:translateY(24px);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
      </div>
    );
  };

  const nothingToShow = !loading && visibleItems.length === 0;

  return (
    <div
      style={{ fontFamily: "'Cygre', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}
      className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0e1a2a] to-[#050507]"
    >
      <PageMeta title="Café Menu — AXIS" description={copy.description} />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <img
          src={resolveSiteImage(copy.image, IMAGES.home)}
          alt="Great food & drink at AXIS"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          onError={hideImageOnError}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-gray-900" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#b9d3ee] mb-4">{copy.eyebrow}</p>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
              {copy.title}{" "}
              <span className="bg-gradient-to-r from-[#b9d3ee] to-[#87b2dd] bg-clip-text text-transparent">
                {copy.highlight}
              </span>
            </h1>
            <p className="mx-auto max-w-3xl text-lg text-gray-200 mb-6 leading-relaxed">{copy.description}</p>
            {copy.note && <p className="text-base text-gray-300 mb-8">{copy.note}</p>}
            <div className="w-32 h-1.5 mx-auto rounded-full bg-gradient-to-r from-[#6a99cb] via-[#87b2dd] to-[#b9d3ee]" />
          </div>
        </div>
      </div>

      <ScrollCue />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Type tabs — one swipeable row on phones, centered on desktop */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 mb-4 sm:mb-8 overflow-x-auto no-scrollbar">
          <div className="flex sm:justify-center gap-2 sm:gap-4 w-max sm:w-auto mx-auto">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.type}
                onClick={() => pickType(tab.type)}
                className={`shrink-0 px-5 sm:px-12 py-3 sm:py-4 rounded-2xl font-bold text-sm sm:text-lg transition-all duration-300 sm:hover:scale-105 ${
                  selectedType === tab.type ? ACTIVE : INACTIVE
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category pills — sticky so you can jump categories without scrolling back up */}
        <div className="sticky top-[72px] sm:top-20 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 py-2 mb-6 sm:mb-12 bg-[#0a1220]/85 backdrop-blur-md overflow-x-auto no-scrollbar">
          <div className="flex sm:justify-center sm:flex-wrap gap-2 sm:gap-3 w-max sm:w-auto mx-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-4 sm:px-8 py-2 sm:py-3 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 sm:hover:scale-105 ${
                selectedCategory === null ? ACTIVE : INACTIVE
              }`}
            >
              All {selectedType}
            </button>
            {typeCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-4 sm:px-8 py-2 sm:py-3 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 sm:hover:scale-105 ${
                  selectedCategory === cat.id ? ACTIVE : INACTIVE
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{scrollbar-width:none}`}</style>

        <ScrollCue />

        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#87b2dd]" />
            <p className="text-white mt-4 text-lg">Loading our delicious menu...</p>
          </div>
        )}

        {!loading &&
          (selectedCategory === null ? (
            <div className="space-y-8 sm:space-y-10">
              {sections.map((sec) => (
                <section key={sec.id}>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">{sec.name}</h2>
                  <div className={GRID}>{sec.items.map(renderCard)}</div>
                </section>
              ))}
              {uncategorized.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-white mb-4">Uncategorized</h2>
                  <div className={GRID}>{uncategorized.map(renderCard)}</div>
                </section>
              )}
            </div>
          ) : (
            <div className={GRID}>{visibleItems.map(renderCard)}</div>
          ))}

        {renderDetail()}

        {nothingToShow && (
          <div className="text-center py-20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-20 w-20 mx-auto text-[#87b2dd] mb-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-white text-xl font-medium">No items available in this category</p>
            <p className="text-gray-400 mt-2">Check back soon for new additions</p>
          </div>
        )}
      </div>
    </div>
  );
}
