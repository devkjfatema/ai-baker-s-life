import { useState, type FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import type { EmailNotification, Order } from '../shared/types';
import { formatCurrency, formatOrderStatusLabel } from '../utils/bakeryLogic';

interface OrderTrackerModalProps {
  open: boolean;
  onClose: () => void;
}

export function OrderTrackerModal({ open, onClose }: OrderTrackerModalProps) {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    order: Order;
    emails: EmailNotification[];
  } | null>(null);

  if (!open) return null;

  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const qs = new URLSearchParams({ email: email.trim() });
      const resp = await fetch(
        `/api/orders/track/${encodeURIComponent(orderNumber.trim())}?${qs.toString()}`,
      );
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Order not found.');
        return;
      }
      setResult(data);
    } catch {
      setError('Unable to check order status right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tracker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E6E2DA] flex items-center justify-between">
          <h2 id="tracker-title" className="font-display text-lg font-semibold text-[#1C1917]">
            Track Your Bakery Order
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order tracker"
            className="w-9 h-9 flex items-center justify-center rounded-md border border-[#E6E2DA] text-[#1C1917] hover:bg-[#F3F1EC] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <form onSubmit={handleLookup} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="track-order-num" className="block text-xs text-[#4A453F] mb-1">
                  Order Number
                </label>
                <input
                  id="track-order-num"
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="ABL-1042"
                  className="w-full h-10 px-3 text-sm font-mono-tabular border border-[#E6E2DA] rounded-md bg-[#FAF9F6] focus:outline-none focus:border-[#1C1917]"
                />
              </div>
              <div>
                <label htmlFor="track-order-email" className="block text-xs text-[#4A453F] mb-1">
                  Customer Email
                </label>
                <input
                  id="track-order-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="julian.park@example.com"
                  className="w-full h-10 px-3 text-sm border border-[#E6E2DA] rounded-md bg-[#FAF9F6] focus:outline-none focus:border-[#1C1917]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 px-4 inline-flex items-center justify-center gap-2 text-sm font-medium text-white rounded-md hover:opacity-90 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              {loading ? 'Checking Oven Schedule...' : 'Check Order Status'}
            </button>
          </form>

          {error && (
            <div role="alert" className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800">
              {error}
            </div>
          )}

          {result && (
            <div className="p-4 rounded-md bg-[#FAF9F6] border border-[#E6E2DA] space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2 border-b border-[#E6E2DA] pb-2">
                <span className="font-mono-tabular font-semibold text-[#1C1917]">
                  #{result.order.orderNumber}
                </span>
                <span className="text-xs font-semibold text-[#2F5241]">
                  {formatOrderStatusLabel(result.order.status, result.order.fulfillmentType)}
                </span>
              </div>
              <div className="text-xs text-[#4A453F] space-y-1">
                {result.order.items.map((i) => (
                  <div key={`${i.productId}-${i.optionId}`} className="flex justify-between">
                    <span>
                      {i.quantity}x {i.productName} ({i.optionLabel})
                    </span>
                    <span className="font-mono-tabular">{formatCurrency(i.lineTotalCents)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-[#E6E2DA] flex justify-between text-xs font-semibold text-[#1C1917]">
                <span>Total Paid</span>
                <span className="font-mono-tabular">{formatCurrency(result.order.totalCents)}</span>
              </div>
              {result.emails.length > 0 && (
                <div className="pt-2 border-t border-[#E6E2DA]">
                  <p className="text-xs font-semibold text-[#1C1917] mb-1">
                    Notifications Sent ({result.emails.length})
                  </p>
                  <ul className="space-y-1 text-xs text-[#57524C]">
                    {result.emails.map((em) => (
                      <li key={em.id}>
                        {em.subject} · {new Date(em.sentAt).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
