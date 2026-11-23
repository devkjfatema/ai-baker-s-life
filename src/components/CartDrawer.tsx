import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { BrandSettings, CartItem } from '../shared/types';
import { formatCurrency } from '../utils/bakeryLogic';
import { ImageWithFallback } from './ImageWithFallback';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  brand: BrandSettings;
  onClose: () => void;
  onUpdateQuantity: (productId: string, optionId: string, delta: number) => void;
  onRemoveItem: (productId: string, optionId: string) => void;
  onProceedToCheckout: () => void;
}

export function CartDrawer({
  open,
  items,
  brand,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
}: CartDrawerProps) {
  if (!open) return null;

  const subtotalCents = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const remainingForFreeDelivery = Math.max(
    0,
    brand.freeDeliveryThresholdCents - subtotalCents,
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FAF9F6] border-l border-[#E6E2DA] h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E6E2DA] bg-[#FFFFFF] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 text-[#1C1917]" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-[#1C1917]">
              Your Bakery Bag
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shopping bag"
            className="w-10 h-10 flex items-center justify-center rounded-md border border-[#E6E2DA] text-[#1C1917] hover:bg-[#F3F1EC] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {items.length > 0 && (
          <div className="px-6 py-2.5 bg-[#F3F1EC] border-b border-[#E6E2DA] text-xs text-[#4A453F]">
            {remainingForFreeDelivery === 0 ? (
              <span className="font-medium text-[#2F5241]">
                Your order qualifies for free local delivery.
              </span>
            ) : (
              <span>
                Add{' '}
                <span className="font-mono-tabular font-semibold text-[#1C1917]">
                  {formatCurrency(remainingForFreeDelivery)}
                </span>{' '}
                more for free local delivery (or pick up free anytime).
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
              <ShoppingBag className="w-10 h-10 text-[#9C948A] mb-3" aria-hidden="true" />
              <p className="font-display text-lg font-medium text-[#1C1917] mb-1">
                Your bag is empty
              </p>
              <p className="text-sm text-[#6B655E] mb-5 max-w-[260px]">
                Add freshly baked loaves, flaky pastries, or celebration cakes to start an order.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-white rounded-md hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Browse Today’s Menu
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.productId}-${item.optionId}`}
                className="flex gap-4 pb-4 border-b border-[#E6E2DA] last:border-b-0"
              >
                <div className="w-20 h-16 rounded-md overflow-hidden bg-[#F3F1EC] shrink-0 border border-[#E6E2DA]">
                  <ImageWithFallback
                    src={item.imageUrl}
                    alt={item.productName}
                    className="w-full h-full object-cover"
                    eager
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#1C1917] truncate">
                      {item.productName}
                    </h3>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.productId, item.optionId)}
                      aria-label={`Remove ${item.productName} (${item.optionLabel}) from bag`}
                      className="text-[#6B655E] hover:text-[#B91C1C] p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-[#6B655E] mt-0.5">{item.optionLabel}</p>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="inline-flex items-center border border-[#E6E2DA] rounded bg-[#FFFFFF]">
                      <button
                        type="button"
                        aria-label={`Decrease quantity for ${item.productName}`}
                        onClick={() => onUpdateQuantity(item.productId, item.optionId, -1)}
                        className="w-8 h-8 flex items-center justify-center text-[#1C1917] hover:bg-[#F3F1EC] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-mono-tabular font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity for ${item.productName}`}
                        onClick={() => onUpdateQuantity(item.productId, item.optionId, 1)}
                        className="w-8 h-8 flex items-center justify-center text-[#1C1917] hover:bg-[#F3F1EC] cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-sm font-mono-tabular font-medium text-[#1C1917]">
                      {formatCurrency(item.unitPriceCents * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-[#E6E2DA] bg-[#FFFFFF] space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#57524C]">Subtotal</span>
              <span className="font-mono-tabular text-base font-semibold text-[#1C1917]">
                {formatCurrency(subtotalCents)}
              </span>
            </div>
            <p className="text-xs text-[#6B655E]">
              Delivery fee and tax calculated at checkout.
            </p>
            <button
              type="button"
              onClick={onProceedToCheckout}
              className="w-full h-11 px-4 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
