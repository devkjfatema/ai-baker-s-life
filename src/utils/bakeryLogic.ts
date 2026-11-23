import type {
  CartItem,
  CheckoutCustomerInput,
  FulfillmentType,
  Order,
  OrderStatus,
  Product,
  ProductCategory,
  SalesReport,
} from '../shared/types';

export interface CartSummary {
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  amountToFreeDeliveryCents: number;
  qualifiesForFreeDelivery: boolean;
}

export function formatCurrency(cents: number): string {
  const safeCents = Number.isFinite(cents) ? cents : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(safeCents / 100);
}

export function calculateCartSummary(
  items: Pick<CartItem, 'unitPriceCents' | 'quantity'>[],
  fulfillmentType: FulfillmentType,
  deliveryFeeCents: number,
  freeDeliveryThresholdCents: number,
  taxRateBasisPoints = 825,
): CartSummary {
  const subtotalCents = items.reduce((sum, item) => {
    const qty = Math.max(0, Math.floor(item.quantity));
    const unit = Math.max(0, Math.round(item.unitPriceCents));
    return sum + unit * qty;
  }, 0);

  const qualifiesForFreeDelivery =
    subtotalCents >= freeDeliveryThresholdCents && subtotalCents > 0;

  const effectiveDeliveryFeeCents =
    fulfillmentType === 'delivery' && subtotalCents > 0 && !qualifiesForFreeDelivery
      ? Math.max(0, Math.round(deliveryFeeCents))
      : 0;

  const amountToFreeDeliveryCents =
    fulfillmentType === 'delivery' && !qualifiesForFreeDelivery
      ? Math.max(0, freeDeliveryThresholdCents - subtotalCents)
      : 0;

  const taxCents = Math.round((subtotalCents * taxRateBasisPoints) / 10000);
  const totalCents = subtotalCents + effectiveDeliveryFeeCents + taxCents;

  return {
    subtotalCents,
    deliveryFeeCents: effectiveDeliveryFeeCents,
    taxCents,
    totalCents,
    amountToFreeDeliveryCents,
    qualifiesForFreeDelivery,
  };
}

export interface ValidationErrors {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  pickupWindow?: string;
  cart?: string;
}

export function validateCheckoutInput(
  input: CheckoutCustomerInput,
  cartCount: number,
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (cartCount <= 0) {
    errors.cart = 'Your shopping bag is empty.';
  }

  if (!input.customerName || input.customerName.trim().length < 2) {
    errors.customerName = 'Please enter your full name.';
  }

  const email = (input.customerEmail || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.customerEmail = 'Please enter a valid email address for your receipt.';
  }

  const phoneDigits = (input.customerPhone || '').replace(/\D/g, '');
  if (phoneDigits.length < 7) {
    errors.customerPhone = 'Please enter a valid contact phone number.';
  }

  if (input.fulfillmentType === 'delivery') {
    if (!input.deliveryAddress || input.deliveryAddress.trim().length < 8) {
      errors.deliveryAddress = 'Please enter a complete street delivery address.';
    }
  } else {
    if (!input.pickupWindow || input.pickupWindow.trim().length < 3) {
      errors.pickupWindow = 'Please select a bakery pickup time window.';
    }
  }

  return errors;
}

export function canFulfillOrderItems(
  cartItems: Array<{ productId: string; optionId: string; quantity: number }>,
  products: Product[],
): { ok: true } | { ok: false; reason: string } {
  if (cartItems.length === 0) {
    return { ok: false, reason: 'Order must contain at least one item.' };
  }

  const requestedByProduct = new Map<string, number>();

  for (const item of cartItems) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { ok: false, reason: 'Item quantity must be a positive whole number.' };
    }
    const product = products.find((p) => p.id === item.productId && p.isActive);
    if (!product) {
      return { ok: false, reason: 'One or more selected products are no longer available.' };
    }
    const option = product.options.find((o) => o.id === item.optionId);
    if (!option) {
      return { ok: false, reason: `Selected size option for ${product.name} is unavailable.` };
    }
    const prev = requestedByProduct.get(product.id) ?? 0;
    const nextTotal = prev + item.quantity;
    if (nextTotal > product.stock) {
      return {
        ok: false,
        reason:
          product.stock === 0
            ? `${product.name} is currently sold out.`
            : `Only ${product.stock} left in stock for ${product.name}.`,
      };
    }
    requestedByProduct.set(product.id, nextTotal);
  }

  return { ok: true };
}

export function getNextAllowedStatuses(
  currentStatus: OrderStatus,
): OrderStatus[] {
  switch (currentStatus) {
    case 'confirmed':
      return ['baking', 'ready', 'cancelled'];
    case 'baking':
      return ['ready', 'completed', 'cancelled'];
    case 'ready':
      return ['completed', 'cancelled'];
    case 'completed':
      return [];
    case 'cancelled':
      return [];
  }
}

export function formatOrderStatusLabel(
  status: OrderStatus,
  fulfillmentType: FulfillmentType,
): string {
  switch (status) {
    case 'confirmed':
      return 'Order Confirmed';
    case 'baking':
      return 'In the Oven';
    case 'ready':
      return fulfillmentType === 'pickup' ? 'Ready for Pickup' : 'Out for Delivery';
    case 'completed':
      return fulfillmentType === 'pickup' ? 'Picked Up' : 'Delivered';
    case 'cancelled':
      return 'Cancelled';
  }
}

export function buildSalesReport(orders: Order[], products: Product[]): SalesReport {
  const validOrders = orders.filter((o) => o.status !== 'cancelled');
  const totalRevenueCents = validOrders.reduce((sum, o) => sum + o.totalCents, 0);
  const totalOrders = validOrders.length;
  const averageOrderValueCents =
    totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0;

  const categories: ProductCategory[] = ['Cakes', 'Pastries', 'Breads', 'Cookies'];
  const categoryMap = new Map<ProductCategory, { revenueCents: number; unitsSold: number }>();
  for (const cat of categories) {
    categoryMap.set(cat, { revenueCents: 0, unitsSold: 0 });
  }

  const productMap = new Map<
    string,
    { productId: string; productName: string; category: ProductCategory; unitsSold: number; revenueCents: number }
  >();
  const dailyMap = new Map<string, { orders: number; revenueCents: number }>();

  let totalUnitsSold = 0;

  for (const order of validOrders) {
    const dayKey = order.createdAt.slice(0, 10);
    const prevDay = dailyMap.get(dayKey) ?? { orders: 0, revenueCents: 0 };
    dailyMap.set(dayKey, {
      orders: prevDay.orders + 1,
      revenueCents: prevDay.revenueCents + order.totalCents,
    });

    for (const item of order.items) {
      totalUnitsSold += item.quantity;
      const catBucket = categoryMap.get(item.category);
      if (catBucket) {
        catBucket.revenueCents += item.lineTotalCents;
        catBucket.unitsSold += item.quantity;
      }

      const prodBucket = productMap.get(item.productId) ?? {
        productId: item.productId,
        productName: item.productName,
        category: item.category,
        unitsSold: 0,
        revenueCents: 0,
      };
      prodBucket.unitsSold += item.quantity;
      prodBucket.revenueCents += item.lineTotalCents;
      productMap.set(item.productId, prodBucket);
    }
  }

  const lowStockCount = products.filter((p) => p.isActive && p.stock <= 5).length;

  return {
    totalRevenueCents,
    totalOrders,
    averageOrderValueCents,
    totalUnitsSold,
    lowStockCount,
    byCategory: categories.map((category) => ({
      category,
      revenueCents: categoryMap.get(category)?.revenueCents ?? 0,
      unitsSold: categoryMap.get(category)?.unitsSold ?? 0,
    })),
    topProducts: Array.from(productMap.values())
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 6),
    dailySeries: Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function escapeCsvCell(value: string | number): string {
  const raw = String(value ?? '');
  const sanitized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export function buildSalesCsv(orders: Order[]): string {
  const headers = [
    'Order Number',
    'Date',
    'Customer',
    'Email',
    'Fulfillment',
    'Status',
    'Payment Method',
    'Items',
    'Subtotal USD',
    'Delivery USD',
    'Tax USD',
    'Total USD',
  ];

  const rows = orders.map((o) => [
    o.orderNumber,
    o.createdAt,
    o.customerName,
    o.customerEmail,
    o.fulfillmentType,
    o.status,
    o.paymentMethod,
    o.items.map((i) => `${i.quantity}x ${i.productName} (${i.optionLabel})`).join('; '),
    (o.subtotalCents / 100).toFixed(2),
    (o.deliveryFeeCents / 100).toFixed(2),
    (o.taxCents / 100).toFixed(2),
    (o.totalCents / 100).toFixed(2),
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\n');
}

export function validateSafeImageUrl(url: string): string | null {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/src/assets/images/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export function validateHexColor(hex: string, fallback: string): string {
  const trimmed = (hex || '').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed : fallback;
}
