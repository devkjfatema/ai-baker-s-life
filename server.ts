import crypto from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import {
  dispatchOrderEmail,
  hashPassword,
  loadDatabase,
  saveDatabase,
  verifyPasswordHash,
  verifyPlaintextPasscode,
} from './server/store';
import type {
  AdminAuthStatus,
  CheckoutCustomerInput,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  ProductCategory,
  ProductOption,
} from './src/shared/types';
import {
  buildSalesCsv,
  buildSalesReport,
  calculateCartSummary,
  canFulfillOrderItems,
  getNextAllowedStatuses,
  validateCheckoutInput,
  validateHexColor,
  validateSafeImageUrl,
} from './src/utils/bakeryLogic';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

const VALID_CATEGORIES: ProductCategory[] = ['Cakes', 'Pastries', 'Breads', 'Cookies'];
const DEFAULT_PRODUCT_IMAGES: Record<ProductCategory, string> = {
  Cakes: '/src/assets/images/product_pistachio_cake_1795412057875.jpg',
  Pastries: '/src/assets/images/product_cardamom_croissant_1795412057428.jpg',
  Breads: '/src/assets/images/product_sourdough_loaf_1795412057458.jpg',
  Cookies: '/src/assets/images/product_brown_butter_cookies_1795412057822.jpg',
};

function signAdminToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'admin',
      exp: Date.now() + 12 * 60 * 60 * 1000,
      jti: crypto.randomUUID(),
    }),
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    return parsed.role === 'admin' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
  return authHeader.slice(7).trim();
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }
  next();
}

function getAuthStatus(req: Request): AdminAuthStatus {
  const db = loadDatabase();
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  const token = extractBearerToken(req);
  return {
    configuredViaEnv: Boolean(envPasscode),
    claimed: Boolean(db.adminPasswordHash),
    authenticated: verifyAdminToken(token),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Public storefront bootstrap
  app.get('/api/bootstrap', (_req, res) => {
    const db = loadDatabase();
    const activeProducts = db.products.filter((p) => p.isActive);
    res.json({
      products: activeProducts,
      brand: db.brand,
      integrations: {
        stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
        emailConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
      },
    });
  });

  app.get('/api/products', (_req, res) => {
    const db = loadDatabase();
    res.json({ products: db.products.filter((p) => p.isActive) });
  });

  // Public customer order placement
  app.post('/api/orders', async (req, res) => {
    try {
      const body = req.body as {
        customer?: CheckoutCustomerInput;
        items?: Array<{ productId: string; optionId: string; quantity: number }>;
      };

      const customer = body.customer;
      const requestedItems = Array.isArray(body.items) ? body.items : [];

      if (!customer) {
        res.status(400).json({ error: 'Customer checkout details are required.' });
        return;
      }

      const validationErrors = validateCheckoutInput(customer, requestedItems.length);
      if (Object.keys(validationErrors).length > 0) {
        res.status(400).json({
          error: 'Please check your checkout details.',
          fieldErrors: validationErrors,
        });
        return;
      }

      const db = loadDatabase();
      const stockCheck = canFulfillOrderItems(requestedItems, db.products);
      if (!stockCheck.ok) {
        res.status(409).json({ error: stockCheck.reason });
        return;
      }

      // Build authoritative order items & decrement stock using server catalog prices
      const orderItems: OrderItem[] = [];
      for (const reqItem of requestedItems) {
        const product = db.products.find((p) => p.id === reqItem.productId)!;
        const option = product.options.find((o) => o.id === reqItem.optionId)!;
        product.stock = Math.max(0, product.stock - reqItem.quantity);
        product.updatedAt = new Date().toISOString();

        orderItems.push({
          productId: product.id,
          optionId: option.id,
          productName: product.name,
          optionLabel: option.label,
          category: product.category,
          unitPriceCents: option.priceCents,
          quantity: reqItem.quantity,
          lineTotalCents: option.priceCents * reqItem.quantity,
        });
      }

      const summary = calculateCartSummary(
        orderItems,
        customer.fulfillmentType,
        db.brand.deliveryFeeCents,
        db.brand.freeDeliveryThresholdCents,
        db.brand.taxRateBasisPoints,
      );

      const orderNumber = `ABL-${db.nextOrderSeq}`;
      db.nextOrderSeq += 1;

      const now = new Date().toISOString();
      const paymentReference =
        customer.paymentMethod === 'stripe_card'
          ? `pi_${crypto.randomBytes(8).toString('hex')}`
          : `PAYID-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

      const newOrder: Order = {
        id: `ord-${crypto.randomUUID()}`,
        orderNumber,
        customerName: customer.customerName.trim(),
        customerEmail: customer.customerEmail.trim().toLowerCase(),
        customerPhone: customer.customerPhone.trim(),
        fulfillmentType: customer.fulfillmentType,
        deliveryAddress:
          customer.fulfillmentType === 'delivery' ? customer.deliveryAddress.trim() : '',
        pickupWindow:
          customer.fulfillmentType === 'pickup' ? customer.pickupWindow.trim() : '',
        orderNotes: (customer.orderNotes || '').trim().slice(0, 400),
        paymentMethod: customer.paymentMethod,
        paymentStatus: 'paid',
        paymentReference,
        status: 'confirmed',
        items: orderItems,
        subtotalCents: summary.subtotalCents,
        deliveryFeeCents: summary.deliveryFeeCents,
        taxCents: summary.taxCents,
        totalCents: summary.totalCents,
        createdAt: now,
        updatedAt: now,
      };

      const confirmationEmail = await dispatchOrderEmail(
        newOrder,
        'order_confirmation',
        db.brand,
      );

      db.orders.unshift(newOrder);
      db.emailLogs.unshift(confirmationEmail);
      saveDatabase(db);

      res.status(201).json({
        order: newOrder,
        emailNotification: confirmationEmail,
      });
    } catch (err) {
      console.error('Order creation failed:', err);
      res.status(500).json({ error: 'Unable to complete order. Please try again.' });
    }
  });

  // Public order status lookup (requires matching email for PII protection)
  app.get('/api/orders/track/:orderNumber', (req, res) => {
    const orderNumber = (req.params.orderNumber || '').trim().toUpperCase();
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!orderNumber || !email) {
      res.status(400).json({ error: 'Order number and customer email are required.' });
      return;
    }
    const db = loadDatabase();
    const match = db.orders.find(
      (o) => o.orderNumber.toUpperCase() === orderNumber && o.customerEmail.toLowerCase() === email,
    );
    if (!match) {
      res.status(404).json({ error: 'No matching order found for that order number and email.' });
      return;
    }
    const relatedEmails = db.emailLogs.filter((e) => e.orderId === match.id);
    res.json({ order: match, emails: relatedEmails });
  });

  // Admin auth status & bootstrap claim / login
  app.get('/api/admin/auth-status', (req, res) => {
    res.json(getAuthStatus(req));
  });

  app.post('/api/admin/claim', (req, res) => {
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode) {
      res.status(403).json({ error: 'Admin passcode is configured via environment secret.' });
      return;
    }
    const db = loadDatabase();
    if (db.adminPasswordHash) {
      res.status(409).json({ error: 'Admin password has already been claimed.' });
      return;
    }
    const password = String(req.body?.password || '');
    if (password.length < 6) {
      res.status(400).json({ error: 'Please choose an admin password of at least 6 characters.' });
      return;
    }
    db.adminPasswordHash = hashPassword(password);
    saveDatabase(db);
    res.status(201).json({ token: signAdminToken() });
  });

  app.post('/api/admin/login', (req, res) => {
    const password = String(req.body?.password || '');
    if (!password) {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    const db = loadDatabase();

    let ok = false;
    if (envPasscode) {
      ok = verifyPlaintextPasscode(password, envPasscode);
    } else if (db.adminPasswordHash) {
      ok = verifyPasswordHash(password, db.adminPasswordHash);
    } else {
      res.status(409).json({ error: 'Admin password has not been set up yet.' });
      return;
    }

    if (!ok) {
      res.status(401).json({ error: 'Incorrect admin password.' });
      return;
    }

    res.json({ token: signAdminToken() });
  });

  // Protected Admin routes
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const db = loadDatabase();
    const report = buildSalesReport(db.orders, db.products);
    res.json({
      products: db.products,
      orders: db.orders,
      emailLogs: db.emailLogs,
      brand: db.brand,
      report,
    });
  });

  app.post('/api/admin/products', requireAdmin, (req, res) => {
    const body = req.body as Partial<Product>;
    const name = (body.name || '').trim();
    const category = body.category as ProductCategory;
    const description = (body.description || '').trim();
    const flavorNotes = (body.flavorNotes || '').trim();
    const stock = Number(body.stock);
    const optionsInput = Array.isArray(body.options) ? body.options : [];

    if (!name || name.length < 2) {
      res.status(400).json({ error: 'Product name must be at least 2 characters.' });
      return;
    }
    if (!VALID_CATEGORIES.includes(category)) {
      res.status(400).json({ error: 'Invalid product category.' });
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      res.status(400).json({ error: 'Stock must be a non-negative whole number.' });
      return;
    }
    if (optionsInput.length === 0) {
      res.status(400).json({ error: 'At least one price option is required.' });
      return;
    }

    const sanitizedOptions: ProductOption[] = [];
    for (const opt of optionsInput) {
      const label = (opt.label || '').trim();
      const priceCents = Math.round(Number(opt.priceCents));
      if (!label || !Number.isFinite(priceCents) || priceCents <= 0) {
        res.status(400).json({ error: 'Each price option requires a label and positive price.' });
        return;
      }
      sanitizedOptions.push({
        id: `opt-${crypto.randomBytes(4).toString('hex')}`,
        label,
        priceCents,
      });
    }

    const validatedImage =
      validateSafeImageUrl(body.imageUrl || '') || DEFAULT_PRODUCT_IMAGES[category];
    const now = new Date().toISOString();
    const slug = `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')}-${crypto.randomBytes(2).toString('hex')}`;

    const newProduct: Product = {
      id: `prod-${crypto.randomUUID()}`,
      slug,
      name,
      category,
      description: description || 'Freshly baked in small batches every morning.',
      flavorNotes: flavorNotes || 'Rich butter, stone-milled flour, natural fermentation',
      allergens: Array.isArray(body.allergens)
        ? body.allergens.map((a) => String(a).trim()).filter(Boolean)
        : ['Wheat', 'Dairy'],
      imageUrl: validatedImage,
      stock,
      isLimitedTime: Boolean(body.isLimitedTime),
      limitedLabel: body.isLimitedTime
        ? (body.limitedLabel || 'Limited Run').trim()
        : undefined,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      options: sanitizedOptions,
      createdAt: now,
      updatedAt: now,
    };

    const db = loadDatabase();
    db.products.unshift(newProduct);
    saveDatabase(db);
    res.status(201).json({ product: newProduct });
  });

  app.patch('/api/admin/products/:id', requireAdmin, (req, res) => {
    const db = loadDatabase();
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const body = req.body as Partial<Product>;
    if (body.name !== undefined) {
      const trimmed = body.name.trim();
      if (trimmed.length < 2) {
        res.status(400).json({ error: 'Product name must be at least 2 characters.' });
        return;
      }
      product.name = trimmed;
    }
    if (body.category !== undefined && VALID_CATEGORIES.includes(body.category)) {
      product.category = body.category;
    }
    if (body.description !== undefined) product.description = body.description.trim();
    if (body.flavorNotes !== undefined) product.flavorNotes = body.flavorNotes.trim();
    if (body.stock !== undefined) {
      const s = Number(body.stock);
      if (!Number.isInteger(s) || s < 0) {
        res.status(400).json({ error: 'Stock must be a non-negative integer.' });
        return;
      }
      product.stock = s;
    }
    if (body.isLimitedTime !== undefined) {
      product.isLimitedTime = Boolean(body.isLimitedTime);
    }
    if (body.limitedLabel !== undefined) {
      product.limitedLabel = body.limitedLabel.trim() || undefined;
    }
    if (body.isActive !== undefined) {
      product.isActive = Boolean(body.isActive);
    }
    if (body.imageUrl !== undefined) {
      const safe = validateSafeImageUrl(body.imageUrl);
      if (safe) product.imageUrl = safe;
    }
    if (Array.isArray(body.options) && body.options.length > 0) {
      const nextOpts: ProductOption[] = [];
      for (const opt of body.options) {
        const label = (opt.label || '').trim();
        const priceCents = Math.round(Number(opt.priceCents));
        if (!label || !Number.isFinite(priceCents) || priceCents <= 0) {
          res.status(400).json({ error: 'All options must have a label and positive price.' });
          return;
        }
        nextOpts.push({
          id: opt.id || `opt-${crypto.randomBytes(4).toString('hex')}`,
          label,
          priceCents,
        });
      }
      product.options = nextOpts;
    }

    product.updatedAt = new Date().toISOString();
    saveDatabase(db);
    res.json({ product });
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const db = loadDatabase();
    const index = db.products.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    db.products.splice(index, 1);
    saveDatabase(db);
    res.json({ ok: true });
  });

  app.patch('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
    const db = loadDatabase();
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    const nextStatus = req.body?.status as OrderStatus;
    const allowed = getNextAllowedStatuses(order.status);
    if (!allowed.includes(nextStatus)) {
      res.status(400).json({
        error: `Cannot change order from ${order.status} to ${nextStatus}.`,
      });
      return;
    }

    order.status = nextStatus;
    if (nextStatus === 'cancelled') {
      order.paymentStatus = 'refunded';
      // Restock items if order is cancelled
      for (const item of order.items) {
        const prod = db.products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stock += item.quantity;
        }
      }
    }
    order.updatedAt = new Date().toISOString();

    const statusEmail = await dispatchOrderEmail(order, 'status_update', db.brand);
    db.emailLogs.unshift(statusEmail);
    saveDatabase(db);

    res.json({ order, emailNotification: statusEmail });
  });

  app.put('/api/admin/brand', requireAdmin, (req, res) => {
    const db = loadDatabase();
    const body = req.body || {};
    db.brand = {
      bakeryName: String(body.bakeryName || db.brand.bakeryName).trim().slice(0, 60),
      tagline: String(body.tagline || db.brand.tagline).trim().slice(0, 180),
      logoText: String(body.logoText || db.brand.logoText).trim().slice(0, 40),
      primaryColor: validateHexColor(body.primaryColor, db.brand.primaryColor),
      accentColor: validateHexColor(body.accentColor, db.brand.accentColor),
      pickupAddress: String(body.pickupAddress || db.brand.pickupAddress).trim().slice(0, 120),
      openingHours: String(body.openingHours || db.brand.openingHours).trim().slice(0, 80),
      contactEmail: String(body.contactEmail || db.brand.contactEmail).trim().slice(0, 80),
      deliveryFeeCents: Math.max(0, Math.round(Number(body.deliveryFeeCents ?? db.brand.deliveryFeeCents))),
      freeDeliveryThresholdCents: Math.max(
        0,
        Math.round(Number(body.freeDeliveryThresholdCents ?? db.brand.freeDeliveryThresholdCents)),
      ),
      taxRateBasisPoints: Math.max(
        0,
        Math.min(2500, Math.round(Number(body.taxRateBasisPoints ?? db.brand.taxRateBasisPoints))),
      ),
    };
    saveDatabase(db);
    res.json({ brand: db.brand });
  });

  app.get('/api/admin/reports/csv', requireAdmin, (_req, res) => {
    const db = loadDatabase();
    const csv = buildSalesCsv(db.orders);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ai-bakers-life-sales.csv"');
    res.send(csv);
  });

  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Baker's Life server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
