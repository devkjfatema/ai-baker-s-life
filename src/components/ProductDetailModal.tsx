import { useEffect, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import type { Product } from '../shared/types';
import { formatCurrency } from '../utils/bakeryLogic';
import { ImageWithFallback } from './ImageWithFallback';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, optionId: string, quantity: number) => void;
}

export function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (product && product.options.length > 0) {
      setSelectedOptionId(product.options[0].id);
      setQuantity(1);
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [product, onClose]);

  if (!product) return null;

  const selectedOption =
    product.options.find((o) => o.id === selectedOptionId) || product.options[0];
  const soldOut = product.stock <= 0;
  const maxQty = Math.max(1, product.stock);

  const handleSubmit = () => {
    if (soldOut || !selectedOption) return;
    onAddToCart(product, selectedOption.id, Math.min(quantity, product.stock));
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close details for ${product.name}`}
          className="absolute top-3 right-3 z-10 w-10 h-10 flex items-center justify-center rounded-md bg-white/90 border border-[#E6E2DA] text-[#1C1917] hover:bg-[#F3F1EC] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Studio Product Image */}
        <div className="bg-[#F3F1EC] flex items-center justify-center">
          <ImageWithFallback
            src={product.imageUrl}
            alt={product.name}
            className="w-full aspect-[4/3] md:h-full object-cover"
            eager
          />
        </div>

        {/* Contiguous Purchase Module */}
        <div className="p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-[#6B655E]">
              <span>{product.category}</span>
              <span aria-hidden="true">·</span>
              <span>
                {product.isLimitedTime
                  ? product.limitedLabel || 'Limited Run'
                  : 'Daily Bake'}
              </span>
              <span aria-hidden="true">·</span>
              <span className={soldOut ? 'text-[#B91C1C] font-medium' : 'text-[#2F5241] font-medium'}>
                {soldOut ? 'Sold Out Today' : `${product.stock} left`}
              </span>
            </div>

            <h2 id="pdp-title" className="font-display text-2xl font-semibold text-[#1C1917] leading-snug">
              {product.name}
            </h2>

            <p className="text-sm text-[#4A453F] leading-relaxed">{product.description}</p>

            <div className="pt-1 border-t border-[#E6E2DA] text-xs space-y-1.5">
              <div>
                <span className="font-semibold text-[#1C1917]">Tasting Notes: </span>
                <span className="text-[#57524C]">{product.flavorNotes}</span>
              </div>
              {product.allergens.length > 0 && (
                <div>
                  <span className="font-semibold text-[#1C1917]">Contains: </span>
                  <span className="text-[#57524C]">{product.allergens.join(' · ')}</span>
                </div>
              )}
            </div>

            {/* Size / Price Options */}
            <fieldset className="pt-2">
              <legend className="text-xs font-semibold text-[#1C1917] mb-2">
                Select Size / Box Option
              </legend>
              <div className="space-y-2">
                {product.options.map((opt) => {
                  const active = selectedOption?.id === opt.id;
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-md border text-sm cursor-pointer transition-colors ${
                        active
                          ? 'border-[#1C1917] bg-[#FAF9F6] font-medium'
                          : 'border-[#E6E2DA] hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="product-option"
                          value={opt.id}
                          checked={active}
                          onChange={() => setSelectedOptionId(opt.id)}
                          className="accent-[#1C1917]"
                        />
                        <span>{opt.label}</span>
                      </span>
                      <span className="font-mono-tabular text-[#1C1917]">
                        {formatCurrency(opt.priceCents)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>

          {/* Quantity + Primary Buy CTA */}
          <div className="pt-3 border-t border-[#E6E2DA] flex items-center gap-3">
            <div className="inline-flex items-center border border-[#E6E2DA] rounded-md bg-[#FAF9F6]">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={soldOut || quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-11 flex items-center justify-center text-[#1C1917] disabled:opacity-40 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center text-sm font-mono-tabular font-medium">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={soldOut || quantity >= maxQty}
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                className="w-10 h-11 flex items-center justify-center text-[#1C1917] disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={soldOut}
              onClick={handleSubmit}
              className="flex-1 h-11 px-4 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-45 cursor-pointer whitespace-nowrap"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {soldOut
                ? 'Sold Out Today'
                : `Add to Bag · ${formatCurrency((selectedOption?.priceCents || 0) * quantity)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
