export type ProductCategory = 'Cakes' | 'Pastries' | 'Breads' | 'Cookies';

export type FulfillmentType = 'pickup' | 'delivery';

export type PaymentMethod = 'stripe_card' | 'paypal';

export type OrderStatus =
  | 'confirmed'
  | 'baking'
  | 'ready'
  | 'completed'
  | 'cancelled';

export interface ProductOption {
  id: string;
  label: string;
  priceCents: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  description: string;
  flavorNotes: string;
  allergens: string[];
  imageUrl: string;
  stock: number;
  isLimitedTime: boolean;
  limitedLabel?: string;
  isActive: boolean;
  options: ProductOption[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  optionId: string;
  productName: string;
  optionLabel: string;
  unitPriceCents: number;
  quantity: number;
  imageUrl: string;
  category: ProductCategory;
}

export interface OrderItem {
  productId: string;
  optionId: string;
  productName: string;
  optionLabel: string;
  category: ProductCategory;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface CheckoutCustomerInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentType: FulfillmentType;
  deliveryAddress: string;
  pickupWindow: string;
  orderNotes: string;
  paymentMethod: PaymentMethod;
  cardLast4?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentType: FulfillmentType;
  deliveryAddress: string;
  pickupWindow: string;
  orderNotes: string;
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'refunded';
  paymentReference: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  recipientEmail: string;
  recipientName: string;
  type: 'order_confirmation' | 'status_update';
  subject: string;
  bodyText: string;
  deliveryChannel: 'resend_live' | 'simulated_outbox';
  status: 'sent' | 'logged';
  sentAt: string;
}

export interface BrandSettings {
  bakeryName: string;
  tagline: string;
  logoText: string;
  primaryColor: string;
  accentColor: string;
  pickupAddress: string;
  openingHours: string;
  contactEmail: string;
  deliveryFeeCents: number;
  freeDeliveryThresholdCents: number;
  taxRateBasisPoints: number;
}

export interface CategorySalesMetric {
  category: ProductCategory;
  revenueCents: number;
  unitsSold: number;
}

export interface TopProductMetric {
  productId: string;
  productName: string;
  category: ProductCategory;
  unitsSold: number;
  revenueCents: number;
}

export interface DailySalesPoint {
  date: string;
  orders: number;
  revenueCents: number;
}

export interface SalesReport {
  totalRevenueCents: number;
  totalOrders: number;
  averageOrderValueCents: number;
  totalUnitsSold: number;
  lowStockCount: number;
  byCategory: CategorySalesMetric[];
  topProducts: TopProductMetric[];
  dailySeries: DailySalesPoint[];
}

export interface AdminAuthStatus {
  configuredViaEnv: boolean;
  claimed: boolean;
  authenticated: boolean;
}

export interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  consentedAt: string;
}
