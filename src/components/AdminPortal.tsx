import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BarChart3,
  Download,
  Lock,
  LogOut,
  Mail,
  Minus,
  Package,
  Palette,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import type {
  AdminAuthStatus,
  BrandSettings,
  EmailNotification,
  Order,
  OrderStatus,
  Product,
  SalesReport,
} from '../shared/types';
import {
  formatCurrency,
  formatOrderStatusLabel,
  getNextAllowedStatuses,
} from '../utils/bakeryLogic';
import { AdminProductModal } from './AdminProductModal';
import { ImageWithFallback } from './ImageWithFallback';

type AdminTab = 'reports' | 'products' | 'orders' | 'brand';

interface AdminPortalProps {
  brand: BrandSettings;
  onBrandUpdated: (nextBrand: BrandSettings) => void;
  onStorefrontCatalogChanged: () => void;
  onExitToStorefront: () => void;
}

export function AdminPortal({
  brand,
  onBrandUpdated,
  onStorefrontCatalogChanged,
  onExitToStorefront,
}: AdminPortalProps) {
  const [authStatus, setAuthStatus] = useState<AdminAuthStatus | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('reports');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailNotification[]>([]);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const [productSearch, setProductSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');
  const [showEmailDrawer, setShowEmailDrawer] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(null);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [brandDraft, setBrandDraft] = useState<BrandSettings>(brand);
  const [brandSaveMessage, setBrandSaveMessage] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    setBrandDraft(brand);
  }, [brand]);

  const checkAuthStatus = useCallback(async (token?: string | null) => {
    try {
      const resp = await fetch('/api/admin/auth-status', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = (await resp.json()) as AdminAuthStatus;
      setAuthStatus(data);
    } catch {
      setAuthStatus({ configuredViaEnv: false, claimed: false, authenticated: false });
    }
  }, []);

  const loadOverview = useCallback(async (token: string) => {
    setDataLoading(true);
    try {
      const resp = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.status === 401) {
        setAdminToken(null);
        return;
      }
      const data = await resp.json();
      setProducts(data.products || []);
      setOrders(data.orders || []);
      setEmailLogs(data.emailLogs || []);
      setReport(data.report || null);
      if (data.brand) setBrandDraft(data.brand);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus(adminToken);
  }, [checkAuthStatus, adminToken]);

  useEffect(() => {
    if (adminToken) {
      loadOverview(adminToken);
    }
  }, [adminToken, loadOverview]);

  const handleClaimOrLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const isClaimFlow = authStatus && !authStatus.configuredViaEnv && !authStatus.claimed;

    if (isClaimFlow) {
      if (passwordInput.length < 6) {
        setAuthError('Password must be at least 6 characters.');
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        setAuthError('Passwords do not match.');
        return;
      }
    }

    setAuthLoading(true);
    try {
      const endpoint = isClaimFlow ? '/api/admin/claim' : '/api/admin/login';
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }
      setPasswordInput('');
      setConfirmPasswordInput('');
      setAdminToken(data.token);
    } catch {
      setAuthError('Unable to reach authentication server.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleQuickStockDelta = async (product: Product, delta: number) => {
    if (!adminToken) return;
    const nextStock = Math.max(0, product.stock + delta);
    const resp = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ stock: nextStock }),
    });
    if (resp.ok) {
      await loadOverview(adminToken);
      onStorefrontCatalogChanged();
    }
  };

  const handleToggleActive = async (product: Product) => {
    if (!adminToken) return;
    const resp = await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: !product.isActive }),
    });
    if (resp.ok) {
      await loadOverview(adminToken);
      onStorefrontCatalogChanged();
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!adminToken) return;
    const resp = await fetch(`/api/admin/products/${product.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (resp.ok) {
      setActionFeedback(`Removed "${product.name}" from catalogue.`);
      await loadOverview(adminToken);
      onStorefrontCatalogChanged();
    }
  };

  const handleUpdateOrderStatus = async (order: Order, nextStatus: OrderStatus) => {
    if (!adminToken) return;
    const resp = await fetch(`/api/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (resp.ok) {
      const data = await resp.json();
      setActionFeedback(
        `Order #${order.orderNumber} updated to ${formatOrderStatusLabel(
          nextStatus,
          order.fulfillmentType,
        )}. Status email dispatched to ${order.customerEmail}.`,
      );
      if (data.emailNotification) {
        setSelectedEmail(data.emailNotification);
      }
      await loadOverview(adminToken);
      onStorefrontCatalogChanged();
    }
  };

  const handleDownloadCsv = async () => {
    if (!adminToken) return;
    const resp = await fetch('/api/admin/reports/csv', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!resp.ok) return;
    const csvText = await resp.text();
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ai-bakers-life-sales.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveBrand = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setBrandSaveMessage(null);
    const resp = await fetch('/api/admin/brand', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(brandDraft),
    });
    if (resp.ok) {
      const data = await resp.json();
      onBrandUpdated(data.brand);
      setBrandSaveMessage('Brand palette and storefront settings saved.');
    }
  };

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [products, productSearch]);

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'all') return orders;
    return orders.filter((o) => o.status === orderStatusFilter);
  }, [orders, orderStatusFilter]);

  // First-Run Claim or Login View
  if (!adminToken) {
    const isFirstRunClaim = authStatus && !authStatus.configuredViaEnv && !authStatus.claimed;

    return (
      <main className="max-w-md mx-auto px-4 py-16">
        <div className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2.5 text-[#1C1917]">
            <Lock className="w-5 h-5" aria-hidden="true" />
            <h1 className="font-display text-2xl font-semibold">
              {isFirstRunClaim ? 'Claim Baker Admin Access' : 'Baker Admin Sign In'}
            </h1>
          </div>

          <p className="text-sm text-[#57524C] leading-relaxed">
            {isFirstRunClaim
              ? 'Set your private baker admin password to manage daily stock, prices, limited-time items, order statuses, and sales reports.'
              : 'Enter your baker admin password to access inventory, orders, and sales analytics.'}
          </p>

          {authError && (
            <div role="alert" className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800">
              {authError}
            </div>
          )}

          <form onSubmit={handleClaimOrLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-password" className="block text-xs font-medium text-[#4A453F] mb-1">
                {isFirstRunClaim ? 'Create Admin Password (min. 6 characters)' : 'Admin Password'}
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password"
                className="w-full h-10 px-3 text-sm border border-[#E6E2DA] rounded-md bg-[#FAF9F6] focus:outline-none focus:border-[#1C1917]"
              />
            </div>

            {isFirstRunClaim && (
              <div>
                <label
                  htmlFor="admin-password-confirm"
                  className="block text-xs font-medium text-[#4A453F] mb-1"
                >
                  Confirm Password
                </label>
                <input
                  id="admin-password-confirm"
                  type="password"
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full h-10 px-3 text-sm border border-[#E6E2DA] rounded-md bg-[#FAF9F6] focus:outline-none focus:border-[#1C1917]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full h-11 px-4 text-sm font-medium text-white rounded-md hover:opacity-90 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {authLoading
                ? 'Verifying...'
                : isFirstRunClaim
                  ? 'Set Password & Open Dashboard'
                  : 'Sign In to Dashboard'}
            </button>
          </form>

          <button
            type="button"
            onClick={onExitToStorefront}
            className="w-full text-center text-xs text-[#6B655E] hover:text-[#1C1917] underline underline-offset-4 cursor-pointer"
          >
            Back to Customer Storefront
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#FAF9F6] flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className="lg:w-64 shrink-0 bg-[#FFFFFF] border-b lg:border-b-0 lg:border-r border-[#E6E2DA] p-4 flex flex-col justify-between gap-4">
        <div className="space-y-1">
          <p className="px-3 py-1.5 text-xs font-medium text-[#6B655E]">
            Operations Console
          </p>
          <div className="flex lg:flex-col gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-[#F3F1EC] text-[#1C1917]'
                  : 'text-[#57524C] hover:bg-[#FAF9F6] hover:text-[#1C1917]'
              }`}
            >
              <BarChart3 className="w-4 h-4" aria-hidden="true" />
              Sales & Reports
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-[#F3F1EC] text-[#1C1917]'
                  : 'text-[#57524C] hover:bg-[#FAF9F6] hover:text-[#1C1917]'
              }`}
            >
              <Package className="w-4 h-4" aria-hidden="true" />
              Products & Stock
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#F3F1EC] text-[#1C1917]'
                  : 'text-[#57524C] hover:bg-[#FAF9F6] hover:text-[#1C1917]'
              }`}
            >
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              Orders & Emails
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('brand')}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
                activeTab === 'brand'
                  ? 'bg-[#F3F1EC] text-[#1C1917]'
                  : 'text-[#57524C] hover:bg-[#FAF9F6] hover:text-[#1C1917]'
              }`}
            >
              <Palette className="w-4 h-4" aria-hidden="true" />
              Brand & Handover
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-[#E6E2DA] flex lg:flex-col gap-2">
          <button
            type="button"
            onClick={onExitToStorefront}
            className="px-3 py-2 text-xs font-medium border border-[#E6E2DA] rounded-md text-[#1C1917] hover:bg-[#F3F1EC] cursor-pointer text-left"
          >
            View Live Storefront
          </button>
          <button
            type="button"
            onClick={() => setAdminToken(null)}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#6B655E] hover:text-[#1C1917] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 max-w-[1160px] space-y-6">
        {/* Top Breadcrumb + Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6E2DA]">
          <div>
            <p className="text-xs text-[#6B655E]">
              {brand.bakeryName} / Baker Admin /{' '}
              <span className="text-[#1C1917] font-medium">
                {activeTab === 'reports'
                  ? 'Sales & Reports'
                  : activeTab === 'products'
                    ? 'Products & Stock'
                    : activeTab === 'orders'
                      ? 'Orders & Emails'
                      : 'Brand & Handover'}
              </span>
            </p>
            <h1 className="font-display text-2xl font-semibold text-[#1C1917] mt-1">
              {activeTab === 'reports'
                ? 'Sales Performance Overview'
                : activeTab === 'products'
                  ? 'Catalogue & Inventory Management'
                  : activeTab === 'orders'
                    ? 'Orders & Customer Notifications'
                    : 'Brand Palette & Owner Handover'}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'reports' && (
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-md hover:opacity-90 cursor-pointer whitespace-nowrap"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Export Sales CSV
              </button>
            )}
            {activeTab === 'products' && (
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setProductModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-md hover:opacity-90 cursor-pointer whitespace-nowrap"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Add Product
              </button>
            )}
            {activeTab === 'orders' && (
              <button
                type="button"
                onClick={() => setShowEmailDrawer((v) => !v)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border border-[#E6E2DA] bg-[#FFFFFF] rounded-md hover:bg-[#F3F1EC] cursor-pointer whitespace-nowrap"
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                {showEmailDrawer ? 'Show Order Queue' : `Email Outbox (${emailLogs.length})`}
              </button>
            )}
          </div>
        </div>

        {actionFeedback && (
          <div className="p-3 rounded-md bg-[#F3F1EC] border border-[#E6E2DA] text-xs text-[#1C1917] flex items-center justify-between gap-2">
            <span>{actionFeedback}</span>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-[#6B655E] hover:text-[#1C1917] underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {dataLoading && !report ? (
          <div className="p-8 border border-[#E6E2DA] rounded-lg bg-[#FFFFFF] text-sm text-[#6B655E]">
            Loading bakery operations data...
          </div>
        ) : null}

        {/* TAB 1: SALES & REPORTS */}
        {activeTab === 'reports' && report && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg">
                <p className="text-xs text-[#6B655E]">Total Revenue</p>
                <p className="mt-1.5 text-2xl font-mono-tabular font-semibold text-[#1C1917]">
                  {formatCurrency(report.totalRevenueCents)}
                </p>
              </div>
              <div className="p-4 bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg">
                <p className="text-xs text-[#6B655E]">Active & Completed Orders</p>
                <p className="mt-1.5 text-2xl font-mono-tabular font-semibold text-[#1C1917]">
                  {report.totalOrders}
                </p>
              </div>
              <div className="p-4 bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg">
                <p className="text-xs text-[#6B655E]">Average Order Value</p>
                <p className="mt-1.5 text-2xl font-mono-tabular font-semibold text-[#1C1917]">
                  {formatCurrency(report.averageOrderValueCents)}
                </p>
              </div>
              <div className="p-4 bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg">
                <p className="text-xs text-[#6B655E]">Low Stock Items (≤ 5)</p>
                <p className="mt-1.5 text-2xl font-mono-tabular font-semibold text-[#1C1917]">
                  {report.lowStockCount}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <section className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#E6E2DA]">
                  <h2 className="text-sm font-semibold text-[#1C1917]">Revenue by Category</h2>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#E6E2DA] text-[#6B655E]">
                      <th className="text-left font-medium px-5 py-2.5">Category</th>
                      <th className="text-right font-medium px-5 py-2.5">Units</th>
                      <th className="text-right font-medium px-5 py-2.5">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F1EC]">
                    {report.byCategory.map((row) => (
                      <tr key={row.category} className="hover:bg-[#FAF9F6]">
                        <td className="px-5 py-3 font-medium text-[#1C1917]">{row.category}</td>
                        <td className="px-5 py-3 text-right font-mono-tabular text-[#57524C]">
                          {row.unitsSold}
                        </td>
                        <td className="px-5 py-3 text-right font-mono-tabular font-medium text-[#1C1917]">
                          {formatCurrency(row.revenueCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* Top Products */}
              <section className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#E6E2DA]">
                  <h2 className="text-sm font-semibold text-[#1C1917]">Top Selling Bakes</h2>
                </div>
                {report.topProducts.length === 0 ? (
                  <p className="p-5 text-xs text-[#6B655E]">No completed sales recorded yet.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#E6E2DA] text-[#6B655E]">
                        <th className="text-left font-medium px-5 py-2.5">Product</th>
                        <th className="text-right font-medium px-5 py-2.5">Units</th>
                        <th className="text-right font-medium px-5 py-2.5">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F1EC]">
                      {report.topProducts.map((item) => (
                        <tr key={item.productId} className="hover:bg-[#FAF9F6]">
                          <td className="px-5 py-3">
                            <div className="font-medium text-[#1C1917]">{item.productName}</div>
                            <div className="text-[#6B655E]">{item.category}</div>
                          </td>
                          <td className="px-5 py-3 text-right font-mono-tabular text-[#57524C]">
                            {item.unitsSold}
                          </td>
                          <td className="px-5 py-3 text-right font-mono-tabular font-medium text-[#1C1917]">
                            {formatCurrency(item.revenueCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS & STOCK */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="w-full sm:w-72">
                <label htmlFor="admin-prod-search" className="sr-only">
                  Filter products
                </label>
                <input
                  id="admin-prod-search"
                  type="search"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Filter inventory by name or category..."
                  className="w-full h-9 px-3 text-xs border border-[#E6E2DA] rounded-md bg-[#FFFFFF] focus:outline-none focus:border-[#1C1917]"
                />
              </div>
              <span className="text-xs text-[#6B655E]">
                {filteredProducts.length} items in catalogue
              </span>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg overflow-x-auto">
              <table className="w-full text-xs min-w-[680px]">
                <thead>
                  <tr className="border-b border-[#E6E2DA] text-[#6B655E]">
                    <th className="text-left font-medium px-4 py-3">Item</th>
                    <th className="text-left font-medium px-4 py-3">Pricing Options</th>
                    <th className="text-center font-medium px-4 py-3">Daily Stock</th>
                    <th className="text-left font-medium px-4 py-3">Visibility</th>
                    <th className="text-right font-medium px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F1EC]">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-[#FAF9F6]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-9 rounded overflow-hidden bg-[#F3F1EC] border border-[#E6E2DA] shrink-0">
                            <ImageWithFallback
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-semibold text-[#1C1917]">{product.name}</div>
                            <div className="text-[#6B655E]">
                              {product.category}
                              {product.isLimitedTime
                                ? ` · ${product.limitedLabel || 'Limited Run'}`
                                : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-[#4A453F]">
                        {product.options.map((opt) => (
                          <div key={opt.id} className="font-mono-tabular">
                            {opt.label}: {formatCurrency(opt.priceCents)}
                          </div>
                        ))}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            aria-label={`Decrease stock for ${product.name}`}
                            onClick={() => handleQuickStockDelta(product, -1)}
                            className="w-7 h-7 flex items-center justify-center border border-[#E6E2DA] rounded hover:bg-[#F3F1EC] cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span
                            className={`w-9 text-center font-mono-tabular font-semibold ${
                              product.stock === 0
                                ? 'text-[#B91C1C]'
                                : product.stock <= 5
                                  ? 'text-[#B45309]'
                                  : 'text-[#1C1917]'
                            }`}
                          >
                            {product.stock}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase stock for ${product.name}`}
                            onClick={() => handleQuickStockDelta(product, 1)}
                            className="w-7 h-7 flex items-center justify-center border border-[#E6E2DA] rounded hover:bg-[#F3F1EC] cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(product)}
                          className={`px-2.5 py-1 rounded border text-xs font-medium cursor-pointer ${
                            product.isActive
                              ? 'border-[#2F5241]/30 text-[#2F5241] bg-[#2F5241]/5'
                              : 'border-[#E6E2DA] text-[#6B655E] bg-[#FAF9F6]'
                          }`}
                        >
                          {product.isActive ? 'Live on Menu' : 'Hidden'}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label={`Edit ${product.name}`}
                            onClick={() => {
                              setEditingProduct(product);
                              setProductModalOpen(true);
                            }}
                            className="p-2 border border-[#E6E2DA] rounded hover:bg-[#F3F1EC] text-[#1C1917] cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${product.name}`}
                            onClick={() => handleDeleteProduct(product)}
                            className="p-2 border border-[#E6E2DA] rounded hover:bg-red-50 text-[#6B655E] hover:text-[#B91C1C] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS & EMAIL LOGS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {showEmailDrawer ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg divide-y divide-[#F3F1EC] max-h-[520px] overflow-y-auto">
                  {emailLogs.length === 0 ? (
                    <p className="p-5 text-xs text-[#6B655E]">No email notifications logged yet.</p>
                  ) : (
                    emailLogs.map((em) => (
                      <button
                        key={em.id}
                        type="button"
                        onClick={() => setSelectedEmail(em)}
                        className={`w-full text-left p-4 hover:bg-[#FAF9F6] cursor-pointer ${
                          selectedEmail?.id === em.id ? 'bg-[#F3F1EC]' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-[#6B655E]">
                          <span className="font-mono-tabular font-medium text-[#1C1917]">
                            #{em.orderNumber}
                          </span>
                          <span>{new Date(em.sentAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs font-semibold text-[#1C1917] mt-1 truncate">
                          {em.subject}
                        </p>
                        <p className="text-xs text-[#57524C] truncate">To: {em.recipientEmail}</p>
                      </button>
                    ))
                  )}
                </div>

                <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg p-5">
                  {selectedEmail || emailLogs[0] ? (
                    (() => {
                      const email = selectedEmail || emailLogs[0];
                      return (
                        <div className="space-y-3">
                          <div className="pb-3 border-b border-[#E6E2DA] space-y-1 text-xs">
                            <p className="font-semibold text-sm text-[#1C1917]">{email.subject}</p>
                            <p className="text-[#57524C]">
                              Recipient: {email.recipientName} ({email.recipientEmail})
                            </p>
                            <p className="text-[#2F5241] font-medium">
                              Channel:{' '}
                              {email.deliveryChannel === 'resend_live'
                                ? 'Live Resend API'
                                : 'Automated Email Outbox'}
                            </p>
                          </div>
                          <pre className="text-xs font-sans text-[#4A453F] whitespace-pre-wrap leading-relaxed">
                            {email.bodyText}
                          </pre>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="text-xs text-[#6B655E]">Select a notification to inspect.</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 p-1 bg-[#F3F1EC] rounded-lg w-fit max-w-full overflow-x-auto">
                  {(['all', 'confirmed', 'baking', 'ready', 'completed', 'cancelled'] as const).map(
                    (statusKey) => (
                      <button
                        key={statusKey}
                        type="button"
                        onClick={() => setOrderStatusFilter(statusKey)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize whitespace-nowrap cursor-pointer ${
                          orderStatusFilter === statusKey
                            ? 'bg-[#FFFFFF] text-[#1C1917] shadow-sm'
                            : 'text-[#57524C] hover:text-[#1C1917]'
                        }`}
                      >
                        {statusKey}
                      </button>
                    ),
                  )}
                </div>

                <div className="space-y-3">
                  {filteredOrders.length === 0 ? (
                    <div className="p-8 bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg text-center text-xs text-[#6B655E]">
                      No orders match this status filter.
                    </div>
                  ) : (
                    filteredOrders.map((order) => {
                      const nextStatuses = getNextAllowedStatuses(order.status);
                      return (
                        <div
                          key={order.id}
                          className="p-5 bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F3F1EC]">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-mono-tabular font-semibold text-sm text-[#1C1917]">
                                #{order.orderNumber}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-medium text-[#1C1917]">
                                {order.customerName}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#57524C]">{order.customerEmail}</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#57524C] capitalize">
                                {order.fulfillmentType}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-[#2F5241]">
                                {formatOrderStatusLabel(order.status, order.fulfillmentType)}
                              </span>
                              <span className="font-mono-tabular text-sm font-semibold text-[#1C1917]">
                                {formatCurrency(order.totalCents)}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#4A453F]">
                            <ul className="space-y-1">
                              {order.items.map((item) => (
                                <li key={`${item.productId}-${item.optionId}`}>
                                  {item.quantity}x {item.productName} ({item.optionLabel})
                                </li>
                              ))}
                            </ul>
                            <div className="space-y-1 text-[#57524C]">
                              <p>
                                {order.fulfillmentType === 'pickup'
                                  ? `Pickup Window: ${order.pickupWindow}`
                                  : `Delivery Address: ${order.deliveryAddress}`}
                              </p>
                              <p>
                                Payment:{' '}
                                {order.paymentMethod === 'stripe_card' ? 'Stripe Card' : 'PayPal'} (
                                <span className="font-mono-tabular">{order.paymentReference}</span>)
                              </p>
                              {order.orderNotes && <p>Notes: {order.orderNotes}</p>}
                            </div>
                          </div>

                          {nextStatuses.length > 0 && (
                            <div className="pt-2 flex flex-wrap items-center gap-2">
                              <span className="text-[11px] text-[#6B655E] mr-1">
                                Update & notify customer:
                              </span>
                              {nextStatuses.map((ns) => {
                                const actionLabel =
                                  ns === 'baking'
                                    ? 'Start Baking'
                                    : ns === 'ready'
                                      ? order.fulfillmentType === 'pickup'
                                        ? 'Mark Ready for Pickup'
                                        : 'Mark Out for Delivery'
                                      : ns === 'completed'
                                        ? order.fulfillmentType === 'pickup'
                                          ? 'Mark Picked Up'
                                          : 'Mark Delivered'
                                        : 'Cancel & Restock';
                                return (
                                  <button
                                    key={ns}
                                    type="button"
                                    onClick={() => handleUpdateOrderStatus(order, ns)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer ${
                                      ns === 'cancelled'
                                        ? 'border-red-200 text-red-700 hover:bg-red-50'
                                        : 'border-[#E6E2DA] bg-[#FAF9F6] text-[#1C1917] hover:bg-[#F3F1EC]'
                                    }`}
                                  >
                                    {actionLabel}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: BRAND SETTINGS & OWNER HANDOVER */}
        {activeTab === 'brand' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleSaveBrand}
              className="lg:col-span-7 bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg p-6 space-y-4 text-sm"
            >
              <h2 className="font-display text-lg font-semibold text-[#1C1917]">
                Brand Palette & Storefront Details
              </h2>

              {brandSaveMessage && (
                <div className="p-3 rounded-md bg-[#F3F1EC] border border-[#E6E2DA] text-xs text-[#2F5241] font-medium">
                  {brandSaveMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="brand-name" className="block text-xs text-[#4A453F] mb-1">
                    Bakery Name
                  </label>
                  <input
                    id="brand-name"
                    type="text"
                    value={brandDraft.bakeryName}
                    onChange={(e) =>
                      setBrandDraft((b) => ({ ...b, bakeryName: e.target.value }))
                    }
                    className="w-full h-10 px-3 border border-[#E6E2DA] rounded-md bg-[#FAF9F6]"
                  />
                </div>
                <div>
                  <label htmlFor="brand-email" className="block text-xs text-[#4A453F] mb-1">
                    Contact Email
                  </label>
                  <input
                    id="brand-email"
                    type="email"
                    value={brandDraft.contactEmail}
                    onChange={(e) =>
                      setBrandDraft((b) => ({ ...b, contactEmail: e.target.value }))
                    }
                    className="w-full h-10 px-3 border border-[#E6E2DA] rounded-md bg-[#FAF9F6]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="brand-tagline" className="block text-xs text-[#4A453F] mb-1">
                  Hero Tagline
                </label>
                <input
                  id="brand-tagline"
                  type="text"
                  value={brandDraft.tagline}
                  onChange={(e) => setBrandDraft((b) => ({ ...b, tagline: e.target.value }))}
                  className="w-full h-10 px-3 border border-[#E6E2DA] rounded-md bg-[#FAF9F6]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="brand-primary" className="block text-xs text-[#4A453F] mb-1">
                    Primary Brand Color (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Primary color picker"
                      value={brandDraft.primaryColor}
                      onChange={(e) =>
                        setBrandDraft((b) => ({ ...b, primaryColor: e.target.value }))
                      }
                      className="w-10 h-10 rounded border border-[#E6E2DA] cursor-pointer"
                    />
                    <input
                      id="brand-primary"
                      type="text"
                      value={brandDraft.primaryColor}
                      onChange={(e) =>
                        setBrandDraft((b) => ({ ...b, primaryColor: e.target.value }))
                      }
                      className="flex-1 h-10 px-3 font-mono-tabular border border-[#E6E2DA] rounded-md bg-[#FAF9F6]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="brand-accent" className="block text-xs text-[#4A453F] mb-1">
                    Accent Color (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Accent color picker"
                      value={brandDraft.accentColor}
                      onChange={(e) =>
                        setBrandDraft((b) => ({ ...b, accentColor: e.target.value }))
                      }
                      className="w-10 h-10 rounded border border-[#E6E2DA] cursor-pointer"
                    />
                    <input
                      id="brand-accent"
                      type="text"
                      value={brandDraft.accentColor}
                      onChange={(e) =>
                        setBrandDraft((b) => ({ ...b, accentColor: e.target.value }))
                      }
                      className="flex-1 h-10 px-3 font-mono-tabular border border-[#E6E2DA] rounded-md bg-[#FAF9F6]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="brand-address" className="block text-xs text-[#4A453F] mb-1">
                    Bakery Pickup Address
                  </label>
                  <input
                    id="brand-address"
                    type="text"
                    value={brandDraft.pickupAddress}
                    onChange={(e) =>
                      setBrandDraft((b) => ({ ...b, pickupAddress: e.target.value }))
                    }
                    className="w-full h-10 px-3 border border-[#E6E2DA] rounded-md bg-[#FAF9F6]"
                  />
                </div>
                <div>
                  <label htmlFor="brand-hours" className="block text-xs text-[#4A453F] mb-1">
                    Opening Hours
                  </label>
                  <input
                    id="brand-hours"
                    type="text"
                    value={brandDraft.openingHours}
                    onChange={(e) =>
                      setBrandDraft((b) => ({ ...b, openingHours: e.target.value }))
                    }
                    className="w-full h-10 px-3 border border-[#E6E2DA] rounded-md bg-[#FAF9F6]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-medium text-white rounded-md hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  Apply Brand Settings
                </button>
              </div>
            </form>

            {/* Owner Handover Guide */}
            <aside className="lg:col-span-5 bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-[#1C1917]">
                Owner Quick-Start Handover Guide
              </h2>
              <p className="text-xs text-[#57524C] leading-relaxed">
                Manage your entire storefront without touching code using these four workflows:
              </p>

              <ol className="space-y-3 text-xs text-[#4A453F] list-decimal pl-4 leading-relaxed">
                <li>
                  <strong className="text-[#1C1917]">Add Limited-Time Items:</strong> Open{' '}
                  <em>Products & Stock → Add Product</em>, check <em>Limited-Time Item</em>, and
                  set size/price options.
                </li>
                <li>
                  <strong className="text-[#1C1917]">Update Daily Stock & Prices:</strong> Use the
                  inline <span className="font-mono-tabular">− / +</span> stock steppers or click
                  the pencil icon on any item to adjust prices or pause seasonal bakes.
                </li>
                <li>
                  <strong className="text-[#1C1917]">Process Orders & Send Emails:</strong> Open{' '}
                  <em>Orders & Emails</em> and click <em>In the Oven</em> or{' '}
                  <em>Ready for Pickup</em>. Customer status emails send and log automatically.
                </li>
                <li>
                  <strong className="text-[#1C1917]">Pull Sales Reports & Connect Live Keys:</strong>{' '}
                  Use <em>Sales & Reports → Export Sales CSV</em> for accounting, and add{' '}
                  <span className="font-mono-tabular">STRIPE_SECRET_KEY</span> and{' '}
                  <span className="font-mono-tabular">RESEND_API_KEY</span> in Environment Secrets
                  when ready for live billing and email delivery.
                </li>
              </ol>
            </aside>
          </div>
        )}
      </main>

      {adminToken && (
        <AdminProductModal
          open={productModalOpen}
          editingProduct={editingProduct}
          adminToken={adminToken}
          onClose={() => setProductModalOpen(false)}
          onSaved={async () => {
            await loadOverview(adminToken);
            onStorefrontCatalogChanged();
          }}
        />
      )}
    </div>
  );
}
