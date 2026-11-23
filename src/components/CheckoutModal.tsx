import { useState, type FormEvent } from 'react';
import { CheckCircle2, CreditCard, Mail, MapPin, Store, X } from 'lucide-react';
import type {
  BrandSettings,
  CartItem,
  EmailNotification,
  FulfillmentType,
  Order,
  PaymentMethod,
} from '../shared/types';
import {
  calculateCartSummary,
  formatCurrency,
  validateCheckoutInput,
  type ValidationErrors,
} from '../utils/bakeryLogic';

interface CheckoutModalProps {
  open: boolean;
  items: CartItem[];
  brand: BrandSettings;
  stripeConfigured: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order, email: EmailNotification) => void;
}

const PICKUP_WINDOWS = [
  'Today · 08:30 AM – 09:30 AM',
  'Today · 11:00 AM – 12:30 PM',
  'Today · 02:00 PM – 04:00 PM',
  'Tomorrow · 08:00 AM – 10:00 AM',
];

export function CheckoutModal({
  open,
  items,
  brand,
  stripeConfigured,
  onClose,
  onOrderSuccess,
}: CheckoutModalProps) {
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('pickup');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pickupWindow, setPickupWindow] = useState(PICKUP_WINDOWS[0]);
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe_card');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [confirmedResult, setConfirmedResult] = useState<{
    order: Order;
    email: EmailNotification;
  } | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  if (!open) return null;

  const summary = calculateCartSummary(
    items,
    fulfillmentType,
    brand.deliveryFeeCents,
    brand.freeDeliveryThresholdCents,
    brand.taxRateBasisPoints,
  );

  const handleCloseAndReset = () => {
    setConfirmedResult(null);
    setShowEmailPreview(false);
    setFieldErrors({});
    setServerError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const input = {
      customerName,
      customerEmail,
      customerPhone,
      fulfillmentType,
      deliveryAddress,
      pickupWindow,
      orderNotes,
      paymentMethod,
    };

    const errors = validateCheckoutInput(input, items.length);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const resp = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: input,
          items: items.map((i) => ({
            productId: i.productId,
            optionId: i.optionId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setServerError(data.error || 'Could not place order.');
        return;
      }

      setConfirmedResult({
        order: data.order,
        email: data.emailNotification,
      });
      onOrderSuccess(data.order, data.emailNotification);
    } catch {
      setServerError('Network error while submitting your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
      onClick={handleCloseAndReset}
    >
      <div
        className="w-full max-w-3xl bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#E6E2DA] flex items-center justify-between sticky top-0 bg-[#FFFFFF] z-10">
          <h2 id="checkout-heading" className="font-display text-xl font-semibold text-[#1C1917]">
            {confirmedResult ? `Order ${confirmedResult.order.orderNumber} Confirmed` : 'Checkout'}
          </h2>
          <button
            type="button"
            onClick={handleCloseAndReset}
            aria-label="Close checkout"
            className="w-10 h-10 flex items-center justify-center rounded-md border border-[#E6E2DA] text-[#1C1917] hover:bg-[#F3F1EC] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {confirmedResult ? (
          <div className="p-6 space-y-6">
            <div className="p-5 rounded-lg bg-[#F3F1EC] border border-[#E6E2DA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#2F5241] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#1C1917]">
                    Thank you, {confirmedResult.order.customerName}
                  </h3>
                  <p className="text-sm text-[#4A453F] mt-0.5">
                    Confirmation sent to{' '}
                    <span className="font-medium text-[#1C1917]">
                      {confirmedResult.order.customerEmail}
                    </span>{' '}
                    · Payment Reference{' '}
                    <span className="font-mono-tabular text-xs">
                      {confirmedResult.order.paymentReference}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailPreview((v) => !v)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium border border-[#E6E2DA] bg-[#FFFFFF] rounded-md hover:bg-[#FAF9F6] cursor-pointer whitespace-nowrap shrink-0"
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                {showEmailPreview ? 'Hide Confirmation Email' : 'View Confirmation Email'}
              </button>
            </div>

            {showEmailPreview && (
              <div className="border border-[#E6E2DA] rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 bg-[#FAF9F6] border-b border-[#E6E2DA] text-xs flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong className="text-[#1C1917]">Subject:</strong>{' '}
                    {confirmedResult.email.subject}
                  </span>
                  <span className="text-[#2F5241] font-medium">
                    {confirmedResult.email.deliveryChannel === 'resend_live'
                      ? 'Delivered via Email Provider'
                      : 'Dispatched to Automated Outbox'}
                  </span>
                </div>
                <pre className="p-4 max-h-48 overflow-y-auto text-xs font-sans text-[#4A453F] whitespace-pre-wrap leading-relaxed bg-[#FFFFFF]">
                  {confirmedResult.email.bodyText}
                </pre>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-[#1C1917]">Fulfillment Details</h4>
                <div className="p-4 rounded-md border border-[#E6E2DA] space-y-1.5 text-[#4A453F]">
                  <p className="font-medium text-[#1C1917]">
                    {confirmedResult.order.fulfillmentType === 'pickup'
                      ? 'Bakery Pickup'
                      : 'Local Delivery'}
                  </p>
                  {confirmedResult.order.fulfillmentType === 'pickup' ? (
                    <>
                      <p>{brand.pickupAddress}</p>
                      <p>Window: {confirmedResult.order.pickupWindow}</p>
                    </>
                  ) : (
                    <p>{confirmedResult.order.deliveryAddress}</p>
                  )}
                  {confirmedResult.order.orderNotes && (
                    <p className="text-xs text-[#6B655E] pt-1">
                      Note: {confirmedResult.order.orderNotes}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-[#1C1917]">Receipt Summary</h4>
                <div className="p-4 rounded-md border border-[#E6E2DA] space-y-2">
                  {confirmedResult.order.items.map((item) => (
                    <div
                      key={`${item.productId}-${item.optionId}`}
                      className="flex justify-between gap-2 text-xs"
                    >
                      <span className="text-[#4A453F]">
                        {item.quantity}x {item.productName} ({item.optionLabel})
                      </span>
                      <span className="font-mono-tabular text-[#1C1917]">
                        {formatCurrency(item.lineTotalCents)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[#E6E2DA] space-y-1 text-xs text-[#57524C]">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-mono-tabular">
                        {formatCurrency(confirmedResult.order.subtotalCents)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery</span>
                      <span className="font-mono-tabular">
                        {confirmedResult.order.deliveryFeeCents === 0
                          ? 'Free'
                          : formatCurrency(confirmedResult.order.deliveryFeeCents)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span className="font-mono-tabular">
                        {formatCurrency(confirmedResult.order.taxCents)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#E6E2DA] text-sm font-semibold text-[#1C1917]">
                      <span>Total Paid</span>
                      <span className="font-mono-tabular">
                        {formatCurrency(confirmedResult.order.totalCents)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCloseAndReset}
                className="px-6 py-2.5 text-sm font-medium text-white rounded-md hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Return to Storefront
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7 space-y-5">
              {serverError && (
                <div
                  role="alert"
                  className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800"
                >
                  {serverError}
                </div>
              )}

              {/* Fulfillment Toggle */}
              <div>
                <span className="block text-xs font-semibold text-[#1C1917] mb-2">
                  1. Pickup or Local Delivery
                </span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#F3F1EC] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('pickup')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      fulfillmentType === 'pickup'
                        ? 'bg-[#FFFFFF] text-[#1C1917] shadow-sm'
                        : 'text-[#57524C] hover:text-[#1C1917]'
                    }`}
                  >
                    <Store className="w-4 h-4" aria-hidden="true" />
                    Bakery Pickup (Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('delivery')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      fulfillmentType === 'delivery'
                        ? 'bg-[#FFFFFF] text-[#1C1917] shadow-sm'
                        : 'text-[#57524C] hover:text-[#1C1917]'
                    }`}
                  >
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    Local Delivery
                  </button>
                </div>
              </div>

              {/* Customer Contact */}
              <div className="space-y-3">
                <span className="block text-xs font-semibold text-[#1C1917]">
                  2. Contact Details
                </span>
                <div>
                  <label htmlFor="checkout-name" className="block text-xs text-[#4A453F] mb-1">
                    Full Name *
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Maya Lin"
                    className="w-full h-10 px-3 text-sm border border-[#E6E2DA] rounded-md bg-[#FFFFFF] focus:outline-none focus:border-[#1C1917]"
                  />
                  {fieldErrors.customerName && (
                    <p className="text-xs text-[#B91C1C] mt-1">{fieldErrors.customerName}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="checkout-email" className="block text-xs text-[#4A453F] mb-1">
                      Email for Receipt *
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="maya@example.com"
                      className="w-full h-10 px-3 text-sm border border-[#E6E2DA] rounded-md bg-[#FFFFFF] focus:outline-none focus:border-[#1C1917]"
                    />
                    {fieldErrors.customerEmail && (
                      <p className="text-xs text-[#B91C1C] mt-1">{fieldErrors.customerEmail}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="checkout-phone" className="block text-xs text-[#4A453F] mb-1">
                      Mobile Phone *
                    </label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(415) 555-0192"
                      className="w-full h-10 px-3 text-sm border border-[#E6E2DA] rounded-md bg-[#FFFFFF] focus:outline-none focus:border-[#1C1917]"
                    />
                    {fieldErrors.customerPhone && (
                      <p className="text-xs text-[#B91C1C] mt-1">{fieldErrors.customerPhone}</p>
                    )}
                  </div>
                </div>

                {fulfillmentType === 'pickup' ? (
                  <div>
                    <label htmlFor="checkout-pickup-window" className="block text-xs text-[#4A453F] mb-1">
                      Pickup Window ({brand.pickupAddress}) *
                    </label>
                    <select
                      id="checkout-pickup-window"
                      value={pickupWindow}
                      onChange={(e) => setPickupWindow(e.target.value)}
                      className="w-full h-10 px-3 text-sm border border-[#E6E2DA] rounded-md bg-[#FFFFFF] focus:outline-none focus:border-[#1C1917]"
                    >
                      {PICKUP_WINDOWS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="checkout-address" className="block text-xs text-[#4A453F] mb-1">
                      Street Delivery Address *
                    </label>
                    <input
                      id="checkout-address"
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="128 Oakwood Avenue, Apt 3"
                      className="w-full h-10 px-3 text-sm border border-[#E6E2DA] rounded-md bg-[#FFFFFF] focus:outline-none focus:border-[#1C1917]"
                    />
                    {fieldErrors.deliveryAddress && (
                      <p className="text-xs text-[#B91C1C] mt-1">{fieldErrors.deliveryAddress}</p>
                    )}
                  </div>
                )}

                <div>
                  <label htmlFor="checkout-notes" className="block text-xs text-[#4A453F] mb-1">
                    Bakery Notes (slicing, gift message, allergies)
                  </label>
                  <input
                    id="checkout-notes"
                    type="text"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Optional instructions for our bakers"
                    className="w-full h-10 px-3 text-sm border border-[#E6E2DA] rounded-md bg-[#FFFFFF] focus:outline-none focus:border-[#1C1917]"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2.5">
                <span className="block text-xs font-semibold text-[#1C1917]">
                  3. Payment Method
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-md border text-xs cursor-pointer ${
                      paymentMethod === 'stripe_card'
                        ? 'border-[#1C1917] bg-[#FAF9F6] font-medium'
                        : 'border-[#E6E2DA]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="stripe_card"
                      checked={paymentMethod === 'stripe_card'}
                      onChange={() => setPaymentMethod('stripe_card')}
                      className="accent-[#1C1917]"
                    />
                    <CreditCard className="w-4 h-4 text-[#1C1917]" aria-hidden="true" />
                    <span>
                      Card via Stripe{' '}
                      {!stripeConfigured && (
                        <span className="text-[#6B655E] font-normal">(Test Mode)</span>
                      )}
                    </span>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-md border text-xs cursor-pointer ${
                      paymentMethod === 'paypal'
                        ? 'border-[#1C1917] bg-[#FAF9F6] font-medium'
                        : 'border-[#E6E2DA]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paypal"
                      checked={paymentMethod === 'paypal'}
                      onChange={() => setPaymentMethod('paypal')}
                      className="accent-[#1C1917]"
                    />
                    <span>PayPal Express</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Order Summary Column */}
            <div className="md:col-span-5">
              <div className="p-5 rounded-lg bg-[#FAF9F6] border border-[#E6E2DA] space-y-4">
                <h3 className="font-display text-base font-semibold text-[#1C1917]">
                  Order Summary
                </h3>

                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={`${item.productId}-${item.optionId}`}
                      className="flex justify-between gap-2 text-xs"
                    >
                      <div className="text-[#4A453F]">
                        <span className="font-medium text-[#1C1917]">
                          {item.quantity}x {item.productName}
                        </span>
                        <div className="text-[#6B655E]">{item.optionLabel}</div>
                      </div>
                      <span className="font-mono-tabular text-[#1C1917] shrink-0">
                        {formatCurrency(item.unitPriceCents * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#E6E2DA] space-y-1.5 text-xs text-[#57524C]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono-tabular">{formatCurrency(summary.subtotalCents)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      {fulfillmentType === 'pickup' ? 'Bakery Pickup' : 'Local Delivery'}
                    </span>
                    <span className="font-mono-tabular">
                      {summary.deliveryFeeCents === 0
                        ? 'Free'
                        : formatCurrency(summary.deliveryFeeCents)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Tax</span>
                    <span className="font-mono-tabular">{formatCurrency(summary.taxCents)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#E6E2DA] text-sm font-semibold text-[#1C1917]">
                    <span>Total</span>
                    <span className="font-mono-tabular">{formatCurrency(summary.totalCents)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || items.length === 0}
                  className="w-full h-11 px-4 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  {submitting
                    ? 'Processing Order...'
                    : `Pay & Place Order · ${formatCurrency(summary.totalCents)}`}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
