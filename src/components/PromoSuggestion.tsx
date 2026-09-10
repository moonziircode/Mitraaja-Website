'use client';

import React, { useState, useEffect, useCallback } from 'react';

export interface AppliedPromoData {
  promo_code: string;
  promo_name?: string;
  total_promo: number;
  discount_type?: string;
  discount_value?: number;
  max_discount?: number | null;
}

export interface PromoSuggestionProps {
  originCode?: string | null;
  destinationCode?: string | null;
  originText?: string | null;
  destinationText?: string | null;
  shippingCost: number;
  appliedPromo: AppliedPromoData | null;
  onApplyPromo: (promo: AppliedPromoData) => void;
  onRemovePromo: () => void;
  disabled?: boolean;
}

interface PromoItem {
  eligible: boolean;
  promoCode: string;
  promoName: string;
  promoDescription?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountPercentage?: number;
  grossDiscount: number;
  maxDiscount: number | null;
  finalDiscount: number;
  finalShippingCost: number;
  isRecommended?: boolean;
}

export default function PromoSuggestion({
  originCode,
  destinationCode,
  originText,
  destinationText,
  shippingCost,
  appliedPromo,
  onApplyPromo,
  onRemovePromo,
  disabled = false,
}: PromoSuggestionProps) {
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch contextual promos when route or shipping cost changes
  const fetchSuggestions = useCallback(async () => {
    if (!originCode || !destinationCode || shippingCost <= 0) {
      setPromos([]);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const params = new URLSearchParams({
        originCode: originCode || '',
        destinationCode: destinationCode || '',
        shippingCost: shippingCost.toString(),
      });

      const res = await fetch(`/api/promo?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.status === 0 && Array.isArray(data.content)) {
        setPromos(data.content);
      } else {
        setPromos([]);
      }
    } catch (err) {
      console.error('Failed to load promo suggestions:', err);
      setPromos([]);
    } finally {
      setIsLoading(false);
    }
  }, [originCode, destinationCode, shippingCost]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Handle Quick Button apply
  const handleQuickApply = (promo: PromoItem) => {
    setErrorMsg(null);
    onApplyPromo({
      promo_code: promo.promoCode.toUpperCase(),
      promo_name: promo.promoName,
      total_promo: promo.finalDiscount,
      discount_type: promo.discountType,
      discount_value: promo.discountPercentage,
      max_discount: promo.maxDiscount,
    });
  };

  // Handle manual promo submission
  const handleManualApply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = manualCode.trim().toUpperCase();
    if (!code) return;

    setManualLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promo_code: code,
          originCode: originCode || undefined,
          destinationCode: destinationCode || undefined,
          task: [
            {
              task_code: 'CURRENT-ORDER',
              base_price: shippingCost,
              total_price: shippingCost,
              promo_amount: 0,
            },
          ],
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 0 && data.content) {
        onApplyPromo({
          promo_code: data.content.promo_code.toUpperCase(),
          promo_name: data.content.promo_name,
          total_promo: data.content.total_promo,
          discount_type: data.content.discount_type,
          discount_value: data.content.discount_value,
          max_discount: data.content.max_discount,
        });
        setManualCode('');
      } else {
        setErrorMsg(data.info || 'Kode promo tidak berlaku untuk rute ini.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal memvalidasi kode promo.');
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── CARD PROMO AKTIF (JIKA SUDAH DIPILIH) ── */}
      {appliedPromo ? (
        <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-extrabold text-emerald-800 uppercase tracking-wider">
                  {appliedPromo.promo_code}
                </span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  Diterapkan
                </span>
              </div>
              <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                Hemat Rp {appliedPromo.total_promo.toLocaleString('id-ID')}
                {appliedPromo.promo_name ? ` • ${appliedPromo.promo_name}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemovePromo}
            disabled={disabled}
            className="h-8 px-3 text-xs font-bold text-gray-500 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 hover:border-rose-200 rounded-lg transition-all"
          >
            Hapus Promo
          </button>
        </div>
      ) : (
        /* ── SECTION QUICK PROMO SUGGESTIONS ── */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-gray-700">
              <span className="material-symbols-outlined text-primary text-[18px]">redeem</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Promo Tersedia Untuk Rute Ini
              </h4>
            </div>
            {isLoading && (
              <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                <div className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Mencari promo...
              </span>
            )}
          </div>

          {/* List of Eligible Promos */}
          {promos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {promos.map((p) => {
                return (
                  <div
                    key={p.promoCode}
                    className={`relative p-3.5 bg-white border rounded-2xl transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-sm ${
                      p.isRecommended
                        ? 'border-primary/40 bg-gradient-to-br from-primary/[0.02] to-primary/[0.05]'
                        : 'border-gray-150 hover:border-primary/30'
                    }`}
                  >
                    {/* Top Recommended Ribbon */}
                    {p.isRecommended && (
                      <div className="absolute top-0 right-0 bg-primary text-white text-[9px] font-extrabold px-2 py-0.5 rounded-bl-lg flex items-center gap-0.5 uppercase tracking-wider">
                        <span>⭐ Rekomendasi</span>
                      </div>
                    )}

                    <div className="space-y-1 pr-14">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-extrabold text-gray-900 uppercase">
                          {p.promoCode}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-primary">
                        Diskon {p.discountPercentage}%
                        {p.maxDiscount ? ` (Maks. Rp ${p.maxDiscount.toLocaleString('id-ID')})` : ' Tanpa Maksimum'}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium line-clamp-2 leading-relaxed">
                        {p.promoDescription}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 font-medium block">Hemat hingga:</span>
                        <span className="text-xs font-mono font-extrabold text-emerald-600">
                          Rp {p.finalDiscount.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickApply(p)}
                        disabled={disabled}
                        className="h-7 px-3 bg-primary hover:bg-primary-dark text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs hover:shadow-sm"
                      >
                        Gunakan
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !isLoading && originCode && destinationCode ? (
            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-center">
              <p className="text-xs text-gray-400 font-medium">
                Belum ada promo yang tersedia untuk rute ini.
              </p>
            </div>
          ) : null}

          {/* ── MANUAL PROMO INPUT ── */}
          <div className="pt-1">
            <form onSubmit={handleManualApply} className="flex gap-2">
              <input
                type="text"
                placeholder="Punya kode promo lain? Ketik di sini"
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value.toUpperCase());
                  setErrorMsg(null);
                }}
                disabled={disabled || manualLoading}
                className="flex-1 h-9 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-800 placeholder:font-sans placeholder:font-normal outline-none focus:border-primary/30 focus:bg-white transition-all uppercase"
              />
              <button
                type="submit"
                disabled={disabled || manualLoading || !manualCode.trim()}
                className="h-9 px-4 bg-gray-900 hover:bg-black disabled:bg-gray-200 text-white disabled:text-gray-400 text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center justify-center gap-1"
              >
                {manualLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Terapkan'
                )}
              </button>
            </form>
            {errorMsg && (
              <p className="text-[11px] font-semibold text-rose-500 mt-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                <span>{errorMsg}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
