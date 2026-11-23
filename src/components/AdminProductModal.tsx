import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { Product, ProductCategory } from '../shared/types';

interface AdminProductModalProps {
  open: boolean;
  editingProduct: Product | null;
  adminToken: string;
  onClose: () => void;
  onSaved: (product: Product, isEdit: boolean) => void;
}

interface DraftOption {
  id?: string;
  label: string;
  priceDollars: string;
}

const IMAGE_PRESETS = [
  {
    label: 'Country Sourdough Photography',
    url: '/src/assets/images/product_sourdough_loaf_1795412057458.jpg',
  },
  {
    label: 'Croissants & Cardamom Buns',
    url: '/src/assets/images/product_cardamom_croissant_1795412057428.jpg',
  },
  {
    label: 'Pistachio Celebration Cake',
    url: '/src/assets/images/product_pistachio_cake_1795412057875.jpg',
  },
  {
    label: 'Brown-Butter Chocolate Cookies',
    url: '/src/assets/images/product_brown_butter_cookies_1795412057822.jpg',
  },
  {
    label: 'Honey Fig & Yuzu Tarts',
    url: '/src/assets/images/product_lemon_tart_1795412057616.jpg',
  },
];

export function AdminProductModal({
  open,
  editingProduct,
  adminToken,
  onClose,
  onSaved,
}: AdminProductModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Pastries');
  const [description, setDescription] = useState('');
  const [flavorNotes, setFlavorNotes] = useState('');
  const [allergensText, setAllergensText] = useState('Wheat, Dairy, Eggs');
  const [stock, setStock] = useState('12');
  const [imageUrl, setImageUrl] = useState(IMAGE_PRESETS[1].url);
  const [isLimitedTime, setIsLimitedTime] = useState(false);
  const [limitedLabel, setLimitedLabel] = useState('Limited Run');
  const [isActive, setIsActive] = useState(true);
  const [options, setOptions] = useState<DraftOption[]>([
    { label: 'Single Item', priceDollars: '6.50' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingProduct) {
      setName(editingProduct.name);
      setCategory(editingProduct.category);
      setDescription(editingProduct.description);
      setFlavorNotes(editingProduct.flavorNotes);
      setAllergensText(editingProduct.allergens.join(', '));
      setStock(String(editingProduct.stock));
      setImageUrl(editingProduct.imageUrl);
      setIsLimitedTime(editingProduct.isLimitedTime);
      setLimitedLabel(editingProduct.limitedLabel || 'Limited Run');
      setIsActive(editingProduct.isActive);
      setOptions(
        editingProduct.options.map((o) => ({
          id: o.id,
          label: o.label,
          priceDollars: (o.priceCents / 100).toFixed(2),
        })),
      );
    } else {
      setName('');
      setCategory('Pastries');
      setDescription('');
      setFlavorNotes('');
      setAllergensText('Wheat, Dairy, Eggs');
      setStock('12');
      setImageUrl(IMAGE_PRESETS[1].url);
      setIsLimitedTime(false);
      setLimitedLabel('Limited Run');
      setIsActive(true);
      setOptions([{ label: 'Single Item', priceDollars: '6.50' }]);
    }
  }, [open, editingProduct]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedStock = Number.parseInt(stock, 10);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setError('Stock must be a whole number (0 or greater).');
      return;
    }

    const parsedOptions = options.map((opt) => ({
      id: opt.id,
      label: opt.label.trim(),
      priceCents: Math.round(Number.parseFloat(opt.priceDollars) * 100),
    }));

    if (
      parsedOptions.length === 0 ||
      parsedOptions.some((o) => !o.label || !Number.isFinite(o.priceCents) || o.priceCents <= 0)
    ) {
      setError('Each price option needs a label and a positive dollar price.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category,
        description: description.trim(),
        flavorNotes: flavorNotes.trim(),
        allergens: allergensText
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        stock: parsedStock,
        imageUrl: imageUrl.trim(),
        isLimitedTime,
        limitedLabel: isLimitedTime ? limitedLabel.trim() || 'Limited Run' : undefined,
        isActive,
        options: parsedOptions,
      };

      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      const resp = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Could not save product.');
        return;
      }

      onSaved(data.product, Boolean(editingProduct));
      onClose();
    } catch {
      setError('Network error while saving product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-product-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E6E2DA] flex items-center justify-between sticky top-0 bg-[#FFFFFF] z-10">
          <h2
            id="admin-product-modal-title"
            className="font-display text-lg font-semibold text-[#1C1917]"
          >
            {editingProduct ? `Edit: ${editingProduct.name}` : 'Add New Bakery Item'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product form"
            className="w-9 h-9 flex items-center justify-center rounded-md border border-[#E6E2DA] hover:bg-[#F3F1EC] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {error && (
            <div role="alert" className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prod-name" className="block text-xs font-medium text-[#4A453F] mb-1">
                Product Name *
              </label>
              <input
                id="prod-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Maple Pecan Kouign-Amann"
                className="w-full h-10 px-3 border border-[#E6E2DA] rounded-md bg-[#FAF9F6] focus:outline-none focus:border-[#1C1917]"
              />
            </div>

            <div>
              <label htmlFor="prod-category" className="block text-xs font-medium text-[#4A453F] mb-1">
                Category *
              </label>
              <select
                id="prod-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full h-10 px-3 border border-[#E6E2DA] rounded-md bg-[#FAF9F6] focus:outline-none focus:border-[#1C1917]"
              >
                <option value="Cakes">Cakes</option>
                <option value="Pastries">Pastries</option>
                <option value="Breads">Breads</option>
                <option value="Cookies">Cookies</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="prod-desc" className="block text-xs font-medium text-[#4A453F] mb-1">
              Description *
            </label>
            <textarea
              id="prod-desc"
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Caramelized laminated pastry folded with Vermont maple and toasted Georgia pecans."
              className="w-full p-3 border border-[#E6E2DA] rounded-md bg-[#FAF9F6] focus:outline-none focus:border-[#1C1917]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prod-flavor" className="block text-xs font-medium text-[#4A453F] mb-1">
                Flavour Notes
              </label>
              <input
                id="prod-flavor"
                type="text"
                value={flavorNotes}
                onChange={(e) => setFlavorNotes(e.target.value)}
                placeholder="Caramelized crust, toasted pecan, sea salt"
                className="w-full h-10 px-3 border border-[#E6E2DA] rounded-md bg-[#FAF9F6] focus:outline-none focus:border-[#1C1917]"
              />
            </div>
            <div>
              <label htmlFor="prod-allergens" className="block text-xs font-medium text-[#4A453F] mb-1">
                Allergens (comma-separated)
              </label>
              <input
                id="prod-allergens"
                type="text"
                value={allergensText}
                onChange={(e) => setAllergensText(e.target.value)}
                placeholder="Wheat, Dairy, Tree Nuts"
                className="w-full h-10 px-3 border border-[#E6E2DA] rounded-md bg-[#FAF9F6] focus:outline-none focus:border-[#1C1917]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="prod-stock" className="block text-xs font-medium text-[#4A453F] mb-1">
                Available Stock *
              </label>
              <input
                id="prod-stock"
                type="number"
                min={0}
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full h-10 px-3 font-mono-tabular border border-[#E6E2DA] rounded-md bg-[#FAF9F6] focus:outline-none focus:border-[#1C1917]"
              />
            </div>

            <label className="flex items-center gap-2 h-10 px-3 border border-[#E6E2DA] rounded-md bg-[#FAF9F6] cursor-pointer text-xs font-medium">
              <input
                type="checkbox"
                checked={isLimitedTime}
                onChange={(e) => setIsLimitedTime(e.target.checked)}
                className="accent-[#1C1917]"
              />
              Limited-Time Item
            </label>

            <label className="flex items-center gap-2 h-10 px-3 border border-[#E6E2DA] rounded-md bg-[#FAF9F6] cursor-pointer text-xs font-medium">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-[#1C1917]"
              />
              Visible in Storefront
            </label>
          </div>

          {isLimitedTime && (
            <div>
              <label htmlFor="prod-limited-label" className="block text-xs font-medium text-[#4A453F] mb-1">
                Seasonal / Limited-Time Label
              </label>
              <input
                id="prod-limited-label"
                type="text"
                value={limitedLabel}
                onChange={(e) => setLimitedLabel(e.target.value)}
                placeholder="Weekend Special"
                className="w-full h-10 px-3 border border-[#E6E2DA] rounded-md bg-[#FAF9F6] focus:outline-none focus:border-[#1C1917]"
              />
            </div>
          )}

          {/* Photo Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prod-image-preset" className="block text-xs font-medium text-[#4A453F] mb-1">
                Studio Photo Preset
              </label>
              <select
                id="prod-image-preset"
                value={IMAGE_PRESETS.some((p) => p.url === imageUrl) ? imageUrl : ''}
                onChange={(e) => {
                  if (e.target.value) setImageUrl(e.target.value);
                }}
                className="w-full h-10 px-3 border border-[#E6E2DA] rounded-md bg-[#FAF9F6] focus:outline-none focus:border-[#1C1917]"
              >
                <option value="">Custom HTTPS Image URL</option>
                {IMAGE_PRESETS.map((preset) => (
                  <option key={preset.label} value={preset.url}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="prod-image-url" className="block text-xs font-medium text-[#4A453F] mb-1">
                Image Path or HTTPS URL
              </label>
              <input
                id="prod-image-url"
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full h-10 px-3 text-xs border border-[#E6E2DA] rounded-md bg-[#FAF9F6] focus:outline-none focus:border-[#1C1917]"
              />
            </div>
          </div>

          {/* Size & Price Options */}
          <div className="pt-2 border-t border-[#E6E2DA] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1C1917]">
                Size & Price Options *
              </span>
              <button
                type="button"
                onClick={() =>
                  setOptions((prev) => [...prev, { label: '', priceDollars: '12.00' }])
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-[#1C1917] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Add Price Option
              </button>
            </div>

            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  aria-label={`Option ${idx + 1} label`}
                  value={opt.label}
                  onChange={(e) =>
                    setOptions((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, label: e.target.value } : item)),
                    )
                  }
                  placeholder="Box of 4"
                  className="flex-1 h-9 px-3 text-xs border border-[#E6E2DA] rounded-md bg-[#FAF9F6]"
                />
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#6B655E]">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.50"
                    required
                    aria-label={`Option ${idx + 1} price`}
                    value={opt.priceDollars}
                    onChange={(e) =>
                      setOptions((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, priceDollars: e.target.value } : item,
                        ),
                      )
                    }
                    className="w-full h-9 pl-6 pr-2 text-xs font-mono-tabular border border-[#E6E2DA] rounded-md bg-[#FAF9F6]"
                  />
                </div>
                {options.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove option ${idx + 1}`}
                    onClick={() => setOptions((prev) => prev.filter((_, i) => i !== idx))}
                    className="w-9 h-9 flex items-center justify-center rounded-md border border-[#E6E2DA] text-[#6B655E] hover:text-[#B91C1C] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#E6E2DA] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border border-[#E6E2DA] rounded-md hover:bg-[#F3F1EC] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-medium text-white rounded-md hover:opacity-90 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {saving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Publish to Storefront'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
