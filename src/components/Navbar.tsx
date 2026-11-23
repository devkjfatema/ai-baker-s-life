import { ShoppingBag, Menu, X } from 'lucide-react';
import { useState } from 'react';

export type ActiveRoute = 'storefront' | 'admin';

interface NavbarProps {
  bakeryName: string;
  activeRoute: ActiveRoute;
  cartCount: number;
  onNavigate: (route: ActiveRoute, sectionId?: string) => void;
  onOpenCart: () => void;
  onOpenTracker: () => void;
}

export function Navbar({
  bakeryName,
  activeRoute,
  cartCount,
  onNavigate,
  onOpenCart,
  onOpenTracker,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (route: ActiveRoute, sectionId?: string) => {
    setMobileMenuOpen(false);
    onNavigate(route, sectionId);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E6E2DA]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick('storefront', 'top');
          }}
          className="font-display text-lg sm:text-xl font-semibold tracking-tight text-[var(--brand-primary)] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand-accent)]"
        >
          {bakeryName}
        </a>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#57524C]"
        >
          <a
            href="#menu"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('storefront', 'menu');
            }}
            className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Daily Menu
          </a>
          <a
            href="#craft"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('storefront', 'craft');
            }}
            className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Our Craft
          </a>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenTracker();
            }}
            className="hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Track Order
          </button>
          <a
            href="#admin"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('admin');
            }}
            className={`hover:text-[#1C1917] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeRoute === 'admin' ? 'text-[#1C1917] underline underline-offset-4 font-semibold' : ''
            }`}
          >
            Baker Admin
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Open shopping bag, ${cartCount} items`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)]"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span>Bag</span>
            <span className="font-mono-tabular text-xs opacity-90">({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-[#E6E2DA] text-[#1C1917] hover:bg-[#F3F1EC] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation dropdown */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden border-t border-[#E6E2DA] bg-[#FAF9F6] px-4 py-3 flex flex-col gap-1"
        >
          <a
            href="#menu"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('storefront', 'menu');
            }}
            className="py-2.5 px-2 text-sm font-medium text-[#1C1917] rounded hover:bg-[#F3F1EC]"
          >
            Daily Menu
          </a>
          <a
            href="#craft"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('storefront', 'craft');
            }}
            className="py-2.5 px-2 text-sm font-medium text-[#1C1917] rounded hover:bg-[#F3F1EC]"
          >
            Our Craft
          </a>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenTracker();
            }}
            className="text-left py-2.5 px-2 text-sm font-medium text-[#1C1917] rounded hover:bg-[#F3F1EC] cursor-pointer"
          >
            Track Order
          </button>
          <a
            href="#admin"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('admin');
            }}
            className="py-2.5 px-2 text-sm font-medium text-[#1C1917] rounded hover:bg-[#F3F1EC]"
          >
            Baker Admin
          </a>
        </nav>
      )}
    </header>
  );
}
