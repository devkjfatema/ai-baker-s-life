import { useCallback, useEffect, useState } from 'react';
import { AdminPortal } from './components/AdminPortal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { Navbar, type ActiveRoute } from './components/Navbar';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { StorefrontView } from './components/StorefrontView';
import type {
  BrandSettings,
  CartItem,
  CookiePreferences,
  Product,
} from './shared/types';

const DEFAULT_BRAND: BrandSettings = {
  bakeryName: "AI Baker's Life",
  tagline: 'Small-batch sourdough, laminated pastries & celebration cakes baked fresh every morning.',
  logoText: "AI Baker's Life",
  primaryColor: '#1C1917',
  accentColor: '#9A4B1E',
  pickupAddress: '214 Hearthstone Lane, Bakery Row',
  openingHours: 'Tue – Sun · 7:30 AM – 5:00 PM',
  contactEmail: 'hello@aibakerslife.com',
  deliveryFeeCents: 600,
  freeDeliveryThresholdCents: 4500,
  taxRateBasisPoints: 825,
};

const COOKIE_STORAGE_KEY = 'ai_bakers_life_cookie_consent_v1';
const CART_STORAGE_KEY = 'ai_bakers_life_cart_v1';

export default function App() {
  const [activeRoute, setActiveRoute] = useState<ActiveRoute>(() =>
    window.location.hash === '#admin' ? 'admin' : 'storefront',
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(false);

  const [cookiePrefs, setCookiePrefs] = useState<CookiePreferences>(() => {
    try {
      const saved = localStorage.getItem(COOKIE_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as CookiePreferences;
    } catch {
      // ignore storage errors
    }
    return {
      essential: true,
      functional: true,
      analytics: false,
      consentedAt: '',
    };
  });
  const [cookieBannerVisible, setCookieBannerVisible] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(COOKIE_STORAGE_KEY);
    } catch {
      return true;
    }
  });

  const fetchStorefrontBootstrap = useCallback(async () => {
    try {
      const resp = await fetch('/api/bootstrap');
      if (!resp.ok) return;
      const data = await resp.json();
      if (Array.isArray(data.products)) setProducts(data.products);
      if (data.brand) setBrand(data.brand);
      if (data.integrations) {
        setStripeConfigured(Boolean(data.integrations.stripeConfigured));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStorefrontBootstrap();
  }, [fetchStorefrontBootstrap]);

  // Apply dynamic brand palette CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', brand.primaryColor);
    root.style.setProperty('--brand-accent', brand.accentColor);
  }, [brand]);

  // Persist cart in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  const handleNavigate = (route: ActiveRoute, sectionId?: string) => {
    setActiveRoute(route);
    if (route === 'admin') {
      window.location.hash = 'admin';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (window.location.hash === '#admin') {
        history.replaceState(null, '', '#top');
      }
      if (sectionId) {
        setTimeout(() => {
          const el = document.getElementById(sectionId);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 40);
      }
    }
  };

  const handleAddToCart = (product: Product, optionId: string, quantity: number) => {
    const option = product.options.find((o) => o.id === optionId) || product.options[0];
    if (!option || product.stock <= 0) return;

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === product.id && item.optionId === option.id,
      );
      if (existingIdx !== -1) {
        const currentQty = prev[existingIdx].quantity;
        const nextQty = Math.min(product.stock, currentQty + quantity);
        return prev.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: nextQty } : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          optionId: option.id,
          productName: product.name,
          optionLabel: option.label,
          unitPriceCents: option.priceCents,
          quantity: Math.min(product.stock, quantity),
          imageUrl: product.imageUrl,
          category: product.category,
        },
      ];
    });
    setCartOpen(true);
  };

  const handleQuickAdd = (product: Product) => {
    if (product.options.length === 0 || product.stock <= 0) return;
    handleAddToCart(product, product.options[0].id, 1);
  };

  const handleUpdateCartQuantity = (productId: string, optionId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    const maxStock = product ? product.stock : 99;

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId || item.optionId !== optionId) return item;
          const nextQty = Math.min(maxStock, item.quantity + delta);
          return { ...item, quantity: nextQty };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const handleRemoveCartItem = (productId: string, optionId: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.optionId === optionId)),
    );
  };

  const handleSaveCookies = (prefs: CookiePreferences) => {
    setCookiePrefs(prefs);
    setCookieBannerVisible(false);
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore storage errors
    }
  };

  const totalBagCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917]">
      <Navbar
        bakeryName={brand.bakeryName}
        activeRoute={activeRoute}
        cartCount={totalBagCount}
        onNavigate={handleNavigate}
        onOpenCart={() => setCartOpen(true)}
        onOpenTracker={() => setTrackerOpen(true)}
      />

      {activeRoute === 'admin' ? (
        <AdminPortal
          brand={brand}
          onBrandUpdated={(nextBrand) => setBrand(nextBrand)}
          onStorefrontCatalogChanged={fetchStorefrontBootstrap}
          onExitToStorefront={() => handleNavigate('storefront', 'top')}
        />
      ) : (
        <StorefrontView
          products={products}
          brand={brand}
          loading={loading}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onQuickAdd={handleQuickAdd}
          onOpenCookieSettings={() => setCookieBannerVisible(true)}
          onOpenAdmin={() => handleNavigate('admin')}
          onOpenTracker={() => setTrackerOpen(true)}
        />
      )}

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        open={cartOpen}
        items={cart}
        brand={brand}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        items={cart}
        brand={brand}
        stripeConfigured={stripeConfigured}
        onClose={() => setCheckoutOpen(false)}
        onOrderSuccess={() => {
          setCart([]);
          fetchStorefrontBootstrap();
        }}
      />

      <OrderTrackerModal
        open={trackerOpen}
        onClose={() => setTrackerOpen(false)}
      />

      <CookieConsentBanner
        visible={cookieBannerVisible}
        initialPreferences={cookiePrefs}
        onSave={handleSaveCookies}
        onClose={() => setCookieBannerVisible(false)}
      />
    </div>
  );
}
