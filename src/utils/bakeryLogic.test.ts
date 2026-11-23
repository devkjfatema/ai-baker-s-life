import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSalesCsv,
  buildSalesReport,
  calculateCartSummary,
  canFulfillOrderItems,
  getNextAllowedStatuses,
  validateCheckoutInput,
  validateHexColor,
  validateSafeImageUrl,
} from './bakeryLogic';
import type { Order, Product } from '../shared/types';

const sampleProducts: Product[] = [
  {
    id: 'prod-sourdough',
    slug: 'country-sourdough',
    name: 'Country Heritage Sourdough',
    category: 'Breads',
    description: 'Slow fermented loaf.',
    flavorNotes: 'Tangy wheat & toasted crust',
    allergens: ['Wheat'],
    imageUrl: '/src/assets/images/product_sourdough_loaf_1795412057458.jpg',
    stock: 4,
    isLimitedTime: false,
    isActive: true,
    options: [
      { id: 'opt-whole', label: 'Whole Boule', priceCents: 950 },
      { id: 'opt-half', label: 'Half Loaf', priceCents: 550 },
    ],
    createdAt: '2026-11-20T08:00:00Z',
    updatedAt: '2026-11-20T08:00:00Z',
  },
  {
    id: 'prod-cake',
    slug: 'pistachio-cake',
    name: 'Sicilian Pistachio Cake',
    category: 'Cakes',
    description: 'Three-tier pistachio sponge.',
    flavorNotes: 'Pistachio & vanilla mascarpone',
    allergens: ['Wheat', 'Dairy', 'Tree Nuts', 'Eggs'],
    imageUrl: '/src/assets/images/product_pistachio_cake_1795412057875.jpg',
    stock: 2,
    isLimitedTime: true,
    limitedLabel: 'Weekend Special',
    isActive: true,
    options: [{ id: 'opt-6in', label: '6-Inch Cake', priceCents: 5400 }],
    createdAt: '2026-11-20T08:00:00Z',
    updatedAt: '2026-11-20T08:00:00Z',
  },
];

test('calculateCartSummary calculates delivery threshold and integer cents totals accurately', () => {
  const belowThreshold = calculateCartSummary(
    [{ unitPriceCents: 950, quantity: 2 }],
    'delivery',
    600,
    4500,
    800,
  );
  assert.equal(belowThreshold.subtotalCents, 1900);
  assert.equal(belowThreshold.deliveryFeeCents, 600);
  assert.equal(belowThreshold.taxCents, 152);
  assert.equal(belowThreshold.totalCents, 2652);
  assert.equal(belowThreshold.qualifiesForFreeDelivery, false);
  assert.equal(belowThreshold.amountToFreeDeliveryCents, 2600);

  const aboveThreshold = calculateCartSummary(
    [{ unitPriceCents: 5400, quantity: 1 }],
    'delivery',
    600,
    4500,
    800,
  );
  assert.equal(aboveThreshold.deliveryFeeCents, 0);
  assert.equal(aboveThreshold.qualifiesForFreeDelivery, true);
  assert.equal(aboveThreshold.amountToFreeDeliveryCents, 0);

  const pickup = calculateCartSummary(
    [{ unitPriceCents: 950, quantity: 1 }],
    'pickup',
    600,
    4500,
    800,
  );
  assert.equal(pickup.deliveryFeeCents, 0);
});

test('canFulfillOrderItems aggregates multi-option quantities for the same product against stock', () => {
  const valid = canFulfillOrderItems(
    [
      { productId: 'prod-sourdough', optionId: 'opt-whole', quantity: 2 },
      { productId: 'prod-sourdough', optionId: 'opt-half', quantity: 2 },
    ],
    sampleProducts,
  );
  assert.equal(valid.ok, true);

  const exceeded = canFulfillOrderItems(
    [
      { productId: 'prod-sourdough', optionId: 'opt-whole', quantity: 3 },
      { productId: 'prod-sourdough', optionId: 'opt-half', quantity: 2 },
    ],
    sampleProducts,
  );
  assert.equal(exceeded.ok, false);
});

test('validateCheckoutInput rejects invalid email, short address on delivery, and empty cart', () => {
  const errors = validateCheckoutInput(
    {
      customerName: 'A',
      customerEmail: 'bad-email',
      customerPhone: '123',
      fulfillmentType: 'delivery',
      deliveryAddress: '12',
      pickupWindow: '',
      orderNotes: '',
      paymentMethod: 'stripe_card',
    },
    0,
  );
  assert.ok(errors.cart);
  assert.ok(errors.customerName);
  assert.ok(errors.customerEmail);
  assert.ok(errors.customerPhone);
  assert.ok(errors.deliveryAddress);
});

test('buildSalesReport excludes cancelled orders and computes category breakdown', () => {
  const orders: Order[] = [
    {
      id: 'ord-1',
      orderNumber: 'ABL-1001',
      customerName: 'Maya Lin',
      customerEmail: 'maya@example.com',
      customerPhone: '555-0102',
      fulfillmentType: 'pickup',
      deliveryAddress: '',
      pickupWindow: '09:00 - 10:00',
      orderNotes: '',
      paymentMethod: 'stripe_card',
      paymentStatus: 'paid',
      paymentReference: 'pi_test_1',
      status: 'completed',
      items: [
        {
          productId: 'prod-cake',
          optionId: 'opt-6in',
          productName: 'Sicilian Pistachio Cake',
          optionLabel: '6-Inch Cake',
          category: 'Cakes',
          unitPriceCents: 5400,
          quantity: 1,
          lineTotalCents: 5400,
        },
      ],
      subtotalCents: 5400,
      deliveryFeeCents: 0,
      taxCents: 432,
      totalCents: 5832,
      createdAt: '2026-11-21T10:00:00Z',
      updatedAt: '2026-11-21T11:00:00Z',
    },
    {
      id: 'ord-2',
      orderNumber: 'ABL-1002',
      customerName: 'Cancelled Order',
      customerEmail: 'cancel@example.com',
      customerPhone: '555-0199',
      fulfillmentType: 'pickup',
      deliveryAddress: '',
      pickupWindow: '10:00 - 11:00',
      orderNotes: '',
      paymentMethod: 'paypal',
      paymentStatus: 'refunded',
      paymentReference: 'pp_test_2',
      status: 'cancelled',
      items: [
        {
          productId: 'prod-sourdough',
          optionId: 'opt-whole',
          productName: 'Country Heritage Sourdough',
          optionLabel: 'Whole Boule',
          category: 'Breads',
          unitPriceCents: 950,
          quantity: 1,
          lineTotalCents: 950,
        },
      ],
      subtotalCents: 950,
      deliveryFeeCents: 0,
      taxCents: 76,
      totalCents: 1026,
      createdAt: '2026-11-21T12:00:00Z',
      updatedAt: '2026-11-21T12:30:00Z',
    },
  ];

  const report = buildSalesReport(orders, sampleProducts);
  assert.equal(report.totalOrders, 1);
  assert.equal(report.totalRevenueCents, 5832);
  assert.equal(report.totalUnitsSold, 1);
  assert.equal(report.lowStockCount, 2);
  assert.equal(report.topProducts[0].productId, 'prod-cake');
});

test('buildSalesCsv neutralizes formula prefixes and escapes quotes', () => {
  const csv = buildSalesCsv([
    {
      id: 'ord-1',
      orderNumber: 'ABL-1001',
      customerName: '=HYPERLINK("bad")',
      customerEmail: 'user@example.com',
      customerPhone: '555-1234',
      fulfillmentType: 'pickup',
      deliveryAddress: '',
      pickupWindow: '10:00',
      orderNotes: '',
      paymentMethod: 'stripe_card',
      paymentStatus: 'paid',
      paymentReference: 'pi_1',
      status: 'confirmed',
      items: [],
      subtotalCents: 1000,
      deliveryFeeCents: 0,
      taxCents: 80,
      totalCents: 1080,
      createdAt: '2026-11-22T09:00:00Z',
      updatedAt: '2026-11-22T09:00:00Z',
    },
  ]);
  assert.match(csv, /"'=HYPERLINK\(""bad""\)"/);
});

test('status transitions and URL/hex validators reject unsafe values', () => {
  assert.deepEqual(getNextAllowedStatuses('confirmed'), ['baking', 'ready', 'cancelled']);
  assert.deepEqual(getNextAllowedStatuses('completed'), []);
  assert.equal(validateSafeImageUrl('javascript:alert(1)'), null);
  assert.equal(validateSafeImageUrl('http://insecure.example.com/a.jpg'), null);
  assert.equal(
    validateSafeImageUrl('/src/assets/images/product_sourdough_loaf_1795412057458.jpg'),
    '/src/assets/images/product_sourdough_loaf_1795412057458.jpg',
  );
  assert.equal(validateHexColor('#9A4B1E', '#000000'), '#9A4B1E');
  assert.equal(validateHexColor('red;background:url(x)', '#1C1917'), '#1C1917');
});
