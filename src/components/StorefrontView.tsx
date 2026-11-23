import { useMemo, useState } from 'react';
import { Search, ShoppingBag } from 'lucide-react';
import type { BrandSettings, Product, ProductCategory } from '../shared/types';
import { formatCurrency } from '../utils/bakeryLogic';
import { ImageWithFallback } from './ImageWithFallback';

interface StorefrontViewProps {
  products: Product[];
  brand: BrandSettings;
  loading: boolean;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onOpenCookieSettings: () => void;
  onOpenAdmin: () => void;
  onOpenTracker: () => void;
}

const CATEGORIES: Array<'All' | ProductCategory> = [
  'All',
  'Cakes',
  'Pastries',
  'Breads',
  'Cookies',
];

export function StorefrontView({
  products,
  brand,
  loading,
  onSelectProduct,
  onQuickAdd,
  onOpenCookieSettings,
  onOpenAdmin,
  onOpenTracker,
}: StorefrontViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProductCategory>('All');
  const [onlyLimited, setOnlyLimited] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (onlyLimited && !p.isLimitedTime) return false;
      if (q) {
        const match =
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.flavorNotes.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [products, selectedCategory, onlyLimited, searchQuery]);

  return (
    <main id="top">
      {/* Section 1: Storefront Hero Split */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 pb-10 lg:pt-12 lg:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-center py-2">
            <p className="text-xs font-medium text-[#6B655E] mb-3">
              {brand.openingHours} · {brand.pickupAddress}
            </p>
            <h1
              className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[#1C1917] leading-[1.08]"
              style={{ textWrap: 'balance' }}
            >
              Warm from our stone deck oven to your table.
            </h1>
            <p className="mt-4 text-base text-[#4A453F] leading-relaxed max-w-[46ch]">
              {brand.tagline} Order online for counter pickup or same-day local delivery.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#menu"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 whitespace-nowrap"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Explore Daily Menu
              </a>
              <button
                type="button"
                onClick={onOpenTracker}
                className="inline-flex items-center justify-center px-5 py-3 text-sm font-medium text-[#1C1917] border border-[#E6E2DA] bg-[#FFFFFF] rounded-md hover:bg-[#F3F1EC] transition-colors whitespace-nowrap cursor-pointer"
              >
                Track an Order
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="w-full h-full min-h-[280px] sm:min-h-[360px] rounded-lg overflow-hidden border border-[#E6E2DA] bg-[#F3F1EC]">
              <ImageWithFallback
                src="/src/assets/images/hero_artisan_bakery_1795412057748.jpg"
                alt="Sunlit artisan bakery counter at AI Baker's Life with croissants, sourdough loaves, and vanilla bean cake"
                className="w-full h-full aspect-[16/9] lg:aspect-auto object-cover"
                eager
              />
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Store Facts Strip */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-b border-[#E6E2DA] divide-y sm:divide-y-0 sm:divide-x divide-[#E6E2DA]">
          <div className="py-4 sm:px-5 first:pl-0">
            <p className="text-xs font-semibold text-[#1C1917]">Morning Hearth</p>
            <p className="text-xs text-[#6B655E] mt-1">Fresh batches out at 7:30 AM daily</p>
          </div>
          <div className="py-4 sm:px-5">
            <p className="text-xs font-semibold text-[#1C1917]">36-Hour Ferment</p>
            <p className="text-xs text-[#6B655E] mt-1">Organic stone-milled grains & cultured butter</p>
          </div>
          <div className="py-4 sm:px-5">
            <p className="text-xs font-semibold text-[#1C1917]">Pickup or Delivery</p>
            <p className="text-xs text-[#6B655E] mt-1">
              Free local delivery over {formatCurrency(brand.freeDeliveryThresholdCents)}
            </p>
          </div>
          <div className="py-4 sm:px-5 last:pr-0">
            <p className="text-xs font-semibold text-[#1C1917]">Instant Confirmation</p>
            <p className="text-xs text-[#6B655E] mt-1">Automated email receipt & oven updates</p>
          </div>
        </div>
      </section>

      {/* Section 2: Daily Bake Product Catalogue */}
      <section id="menu" className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E6E2DA]">
          <div>
            <h2 className="font-display text-3xl font-semibold text-[#1C1917]">
              Today’s Bake Menu
            </h2>
            <p className="text-sm text-[#57524C] mt-1">
              Select a size or box option to customize your order, or quick-add single bakes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <label htmlFor="menu-search" className="sr-only">
                Search bakery products
              </label>
              <Search
                className="w-4 h-4 text-[#6B655E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="menu-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cakes, breads..."
                className="w-full sm:w-64 h-10 pl-9 pr-3 text-sm border border-[#E6E2DA] rounded-md bg-[#FFFFFF] focus:outline-none focus:border-[#1C1917]"
              />
            </div>

            <button
              type="button"
              onClick={() => setOnlyLimited((v) => !v)}
              aria-pressed={onlyLimited}
              className={`h-10 px-3.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                onlyLimited
                  ? 'border-[#1C1917] bg-[#1C1917] text-white'
                  : 'border-[#E6E2DA] bg-[#FFFFFF] text-[#4A453F] hover:text-[#1C1917]'
              }`}
            >
              Limited Run Only
            </button>
          </div>
        </div>

        {/* Category Filter Segmented Control */}
        <div
          role="tablist"
          aria-label="Product Categories"
          className="mt-6 flex items-center gap-1.5 p-1 bg-[#F3F1EC] rounded-lg w-fit max-w-full overflow-x-auto"
        >
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#FFFFFF] text-[#1C1917] shadow-sm'
                    : 'text-[#57524C] hover:text-[#1C1917]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="border border-[#E6E2DA] rounded-lg bg-[#FFFFFF] overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-[#F3F1EC]" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-28 bg-[#F3F1EC] rounded" />
                  <div className="h-5 w-48 bg-[#F3F1EC] rounded" />
                  <div className="h-4 w-full bg-[#F3F1EC] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-8 p-12 border border-[#E6E2DA] rounded-lg bg-[#FFFFFF] text-center">
            <p className="font-display text-lg font-medium text-[#1C1917]">
              No matching bakes found
            </p>
            <p className="text-sm text-[#6B655E] mt-1">
              Try clearing your search or switching back to all bakery categories.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setOnlyLimited(false);
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 text-xs font-medium border border-[#E6E2DA] rounded-md hover:bg-[#F3F1EC] cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredProducts.map((product) => {
              const lowestPrice = Math.min(...product.options.map((o) => o.priceCents));
              const soldOut = product.stock <= 0;

              return (
                <article
                  key={product.id}
                  className="group border border-[#E6E2DA] rounded-lg bg-[#FFFFFF] overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    className="text-left block w-full bg-[#F3F1EC] overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand-accent)]"
                  >
                    <ImageWithFallback
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full aspect-[4/3] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </button>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-1.5">
                      {/* Clean unboxed metadata kicker */}
                      <div className="flex items-center gap-2 text-xs text-[#6B655E]">
                        <span>{product.category}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            product.isLimitedTime
                              ? 'font-medium text-[var(--brand-accent)]'
                              : undefined
                          }
                        >
                          {product.isLimitedTime
                            ? product.limitedLabel || 'Limited Run'
                            : 'Daily Bake'}
                        </span>
                        {soldOut ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-[#B91C1C]">Sold Out</span>
                          </>
                        ) : product.stock <= 5 ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-[#B45309]">
                              Only {product.stock} left
                            </span>
                          </>
                        ) : null}
                      </div>

                      <h3 className="text-base font-semibold text-[#1C1917] leading-snug">
                        <button
                          type="button"
                          onClick={() => onSelectProduct(product)}
                          className="text-left hover:underline underline-offset-4 cursor-pointer"
                        >
                          {product.name}
                        </button>
                      </h3>

                      <p className="text-sm text-[#57524C] line-clamp-2 leading-relaxed">
                        {product.flavorNotes}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#F3F1EC] flex items-center justify-between gap-3">
                      <div>
                        <span className="text-sm font-mono-tabular font-semibold text-[#1C1917]">
                          {product.options.length > 1
                            ? `From ${formatCurrency(lowestPrice)}`
                            : formatCurrency(lowestPrice)}
                        </span>
                        <span className="block text-[11px] text-[#6B655E]">
                          {product.options.length}{' '}
                          {product.options.length === 1 ? 'size option' : 'size options'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectProduct(product)}
                          className="h-10 px-3 text-xs font-medium border border-[#E6E2DA] rounded-md text-[#1C1917] hover:bg-[#F3F1EC] transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Options
                        </button>
                        <button
                          type="button"
                          disabled={soldOut}
                          onClick={() => onQuickAdd(product)}
                          aria-label={`Add ${product.name} to bag`}
                          className="h-10 px-3.5 inline-flex items-center gap-1.5 text-xs font-medium text-white rounded-md transition-opacity hover:opacity-90 disabled:opacity-40 whitespace-nowrap cursor-pointer"
                          style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 3: Craftsmanship Story & Local Pickup Details */}
      <section id="craft" className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 border-t border-[#E6E2DA]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6">
            <div className="w-full h-full rounded-lg overflow-hidden border border-[#E6E2DA] bg-[#F3F1EC]">
              <ImageWithFallback
                src="/src/assets/images/craft_baker_kneading_1795412058091.jpg"
                alt="Baker shaping sourdough loaves by hand on a maple bench"
                className="w-full h-full aspect-[4/3] object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col justify-center space-y-5 py-2">
            <p className="text-xs font-medium text-[var(--brand-accent)]">
              Small-Batch Craftsmanship
            </p>
            <h2
              className="font-display text-3xl font-semibold text-[#1C1917] leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Stone-milled grains, slow fermentation, zero shortcuts.
            </h2>
            <p className="text-sm sm:text-base text-[#4A453F] leading-relaxed">
              Every loaf, croissant, and celebration cake at {brand.bakeryName} begins days before
              it reaches the counter. Our sourdough rests 36 hours in cold fermentation; our pastry
              dough is laminated with cultured butter; and seasonal tarts are built around peak-harvest
              orchard fruit.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#E6E2DA] text-sm">
              <div>
                <h3 className="font-semibold text-[#1C1917]">Bakery Counter</h3>
                <p className="text-[#57524C] mt-1">{brand.pickupAddress}</p>
                <p className="text-[#6B655E] text-xs mt-0.5">{brand.openingHours}</p>
              </div>
              <div>
                <h3 className="font-semibold text-[#1C1917]">Orders & Special Requests</h3>
                <p className="text-[#57524C] mt-1">{brand.contactEmail}</p>
                <p className="text-[#6B655E] text-xs mt-0.5">
                  Delivery fee {formatCurrency(brand.deliveryFeeCents)} · Free over{' '}
                  {formatCurrency(brand.freeDeliveryThresholdCents)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Clean Footer */}
      <footer className="border-t border-[#E6E2DA] bg-[#F3F1EC]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#57524C]">
          <div>
            <span className="font-display text-sm font-semibold text-[#1C1917]">
              {brand.bakeryName}
            </span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={onOpenTracker}
              className="hover:text-[#1C1917] underline-offset-4 hover:underline cursor-pointer"
            >
              Track Order
            </button>
            <button
              type="button"
              onClick={onOpenCookieSettings}
              className="hover:text-[#1C1917] underline-offset-4 hover:underline cursor-pointer"
            >
              Cookie Preferences
            </button>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="hover:text-[#1C1917] underline-offset-4 hover:underline cursor-pointer"
            >
              Baker Admin Portal
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}
