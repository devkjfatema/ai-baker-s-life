import { useState } from 'react';
import type { CookiePreferences } from '../shared/types';

interface CookieConsentBannerProps {
  visible: boolean;
  initialPreferences: CookiePreferences;
  onSave: (prefs: CookiePreferences) => void;
  onClose: () => void;
}

export function CookieConsentBanner({
  visible,
  initialPreferences,
  onSave,
  onClose,
}: CookieConsentBannerProps) {
  const [showCustomize, setShowCustomize] = useState(false);
  const [functional, setFunctional] = useState(initialPreferences.functional);
  const [analytics, setAnalytics] = useState(initialPreferences.analytics);

  if (!visible) return null;

  const handleAcceptAll = () => {
    onSave({
      essential: true,
      functional: true,
      analytics: true,
      consentedAt: new Date().toISOString(),
    });
  };

  const handleEssentialOnly = () => {
    onSave({
      essential: true,
      functional: false,
      analytics: false,
      consentedAt: new Date().toISOString(),
    });
  };

  const handleSaveCustom = () => {
    onSave({
      essential: true,
      functional,
      analytics,
      consentedAt: new Date().toISOString(),
    });
    setShowCustomize(false);
  };

  return (
    <aside
      aria-label="Cookie consent notice"
      className="fixed bottom-2 left-2 right-2 sm:left-auto sm:right-6 sm:bottom-5 sm:max-w-md z-30 bg-[#FFFFFF] border border-[#E6E2DA] rounded-lg shadow-lg p-2.5 sm:p-4 text-[#1C1917]"
    >
      {!showCustomize ? (
        <div className="flex flex-col gap-1.5 sm:gap-2.5">
          <p className="text-[11px] sm:text-sm text-[#4A453F] leading-tight sm:leading-snug">
            Essential cookies power your bag; optional cookies save pickup preferences.
          </p>
          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowCustomize(true)}
              className="px-2 py-1 text-[11px] sm:text-xs font-medium text-[#57524C] hover:text-[#1C1917] underline underline-offset-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              Preferences
            </button>
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium border border-[#E6E2DA] rounded-md text-[#1C1917] hover:bg-[#F3F1EC] cursor-pointer whitespace-nowrap shrink-0"
            >
              Essential Only
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-white rounded-md hover:opacity-90 cursor-pointer whitespace-nowrap shrink-0"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Accept All
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1C1917]">Cookie Preferences</h2>
            <button
              type="button"
              onClick={() => {
                setShowCustomize(false);
                onClose();
              }}
              className="text-xs text-[#6B655E] hover:text-[#1C1917] cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-[#F3F1EC]">
              <div>
                <span className="font-medium text-[#1C1917]">Essential Cart & Checkout</span>
                <p className="text-[#6B655E]">Required for cart items and order submission.</p>
              </div>
              <span className="text-[#2F5241] font-medium">Always on</span>
            </div>

            <label className="flex items-center justify-between py-1 border-b border-[#F3F1EC] cursor-pointer">
              <div>
                <span className="font-medium text-[#1C1917]">Functional Preferences</span>
                <p className="text-[#6B655E]">Remembers your preferred pickup or delivery mode.</p>
              </div>
              <input
                type="checkbox"
                checked={functional}
                onChange={(e) => setFunctional(e.target.checked)}
                className="w-4 h-4 accent-[#1C1917]"
              />
            </label>

            <label className="flex items-center justify-between py-1 cursor-pointer">
              <div>
                <span className="font-medium text-[#1C1917]">Storefront Analytics</span>
                <p className="text-[#6B655E]">Helps us plan daily bake quantities.</p>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="w-4 h-4 accent-[#1C1917]"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCustomize(false)}
              className="px-3 py-1.5 text-xs font-medium border border-[#E6E2DA] rounded-md hover:bg-[#F3F1EC] cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSaveCustom}
              className="px-3 py-1.5 text-xs font-medium text-white rounded-md hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
