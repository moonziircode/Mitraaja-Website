"use client";

import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import SearchableDistrictSelect from "@/components/SearchableDistrictSelect";
import { 
  Package, 
  MapPin, 
  Calculator, 
  Loader2, 
  AlertCircle, 
  Tag, 
  CheckCircle2, 
  X, 
  Sparkles,
  ArrowRight
} from "lucide-react";
import axios from "axios";

interface RatesClientProps {
  user: {
    name: string;
    nia: string;
    districtCode?: string;
    storeName?: string;
  };
}

interface AppliedPromoInfo {
  promo_code: string;
  promo_name?: string;
  discount_amount: number;
  final_price: number;
  discount_percentage?: number;
  max_discount?: number | null;
}

interface EligiblePromoItem {
  promoCode: string;
  promoName: string;
  promoDescription?: string;
  discountPercentage?: number;
  finalDiscount: number;
  maxDiscount: number | null;
  isRecommended?: boolean;
}

interface ServiceRate {
  product_code: string;
  product_name: string;
  duration: string;
  weight: number;
  delivery_price: number;
  applied_promo?: AppliedPromoInfo | null;
  promo_error?: string | null;
  eligible_promos?: EligiblePromoItem[];
  recommended_promo?: EligiblePromoItem | null;
}

export default function RatesClient({ user }: RatesClientProps) {
  const [origin, setOrigin] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [weight, setWeight] = useState<string>("1");
  const [rates, setRates] = useState<ServiceRate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Promo State
  const [promoCodeInput, setPromoCodeInput] = useState<string>("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromoInfo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [eligiblePromos, setEligiblePromos] = useState<EligiblePromoItem[]>([]);
  const [isPromoLoading, setIsPromoLoading] = useState(false);

  // Fetch available contextual promos from server when route changes
  const fetchEligiblePromos = useCallback(async () => {
    const originCode = origin?.code || origin?.district_code;
    const destinationCode = destination?.code || destination?.district_code;
    
    if (!originCode || !destinationCode) {
      setEligiblePromos([]);
      return;
    }

    setIsPromoLoading(true);
    try {
      // Estimate baseline shipping cost based on weight (default 11500 per kg)
      const baseEstimate = rates.length > 0 ? rates[0].delivery_price : Math.max(1, Number(weight) || 1) * 11500;
      
      const res = await axios.get("/api/promo", {
        params: {
          originCode,
          destinationCode,
          shippingCost: baseEstimate,
        },
      });

      if (res.data?.status === 0 && Array.isArray(res.data?.content)) {
        setEligiblePromos(res.data.content);
      } else {
        setEligiblePromos([]);
      }
    } catch {
      setEligiblePromos([]);
    } finally {
      setIsPromoLoading(false);
    }
  }, [origin, destination, weight, rates]);

  // Load contextual promos whenever origin or destination changes
  useEffect(() => {
    fetchEligiblePromos();
  }, [fetchEligiblePromos]);

  // When origin or destination changes, reset applied promo if route no longer matches
  const handleOriginChange = (opt: any) => {
    setOrigin(opt);
    if (appliedPromo) {
      setAppliedPromo(null);
      setPromoError(null);
    }
  };

  const handleDestinationChange = (opt: any) => {
    setDestination(opt);
    if (appliedPromo) {
      setAppliedPromo(null);
      setPromoError(null);
    }
  };

  // Main Rate Calculation with Promo Engine
  const handleCheckRates = async (overridePromoCode?: string) => {
    if (!origin || !destination || !weight) {
      setError("Silakan lengkapi asal, tujuan, dan berat barang.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPromoError(null);

    const activePromoCode = overridePromoCode !== undefined 
      ? overridePromoCode 
      : (appliedPromo ? appliedPromo.promo_code : promoCodeInput.trim());

    try {
      const response = await axios.post("/api/rates/check", {
        origin: origin.name,
        destination: destination.name,
        weight: Number(weight),
        originCode: origin.code || origin.district_code,
        destinationCode: destination.code || destination.district_code,
        promoCode: activePromoCode || undefined,
      });

      if (response.data.success && response.data.content) {
        setRates(response.data.content);

        // Update promo application status from server response
        if (response.data.applied_promo) {
          setAppliedPromo(response.data.applied_promo);
          setPromoCodeInput(response.data.applied_promo.promo_code);
          setPromoError(null);
        } else if (activePromoCode && response.data.promo_error) {
          setAppliedPromo(null);
          setPromoError(response.data.promo_error);
        } else {
          setAppliedPromo(null);
          setPromoError(null);
        }

        // Update eligible promos from server calculation
        if (Array.isArray(response.data.eligible_promos)) {
          setEligiblePromos(response.data.eligible_promos);
        }
      } else {
        setError(response.data.info || "Gagal mendapatkan tarif.");
      }
    } catch (err: any) {
      setError(err.response?.data?.info || "Terjadi kesalahan saat menghubungi server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual promo submission
  const handleApplyManualPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      setPromoError("Masukkan kode promo terlebih dahulu.");
      return;
    }
    handleCheckRates(code);
  };

  // Handle Quick Button apply
  const handleQuickApplyPromo = (code: string) => {
    setPromoCodeInput(code.toUpperCase());
    handleCheckRates(code.toUpperCase());
  };

  // Handle Remove Promo
  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput("");
    setPromoError(null);
    handleCheckRates("");
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto bg-surface">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Cek Ongkir
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-pink-50 border border-pink-100 text-xs font-semibold text-pink-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Promo Aktif
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              Cek estimasi tarif pengiriman Anteraja dengan diskon promo resmi Mitraaja
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-8 relative">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-6 relative z-20">
              {/* Origin District */}
              <div className="flex-1 relative">
                <div className="flex items-center gap-2 mb-2 text-pink-600">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-bold">Kecamatan Asal</span>
                </div>
                <SearchableDistrictSelect
                  label=""
                  value={origin?.name || ""}
                  onChange={handleOriginChange}
                  placeholder=""
                />
              </div>
              
              {/* Swap Button */}
              <div className="flex items-center justify-center -mx-4 md:mx-0 z-10 md:pt-6">
                <button
                  type="button"
                  onClick={() => {
                    const temp = origin;
                    handleOriginChange(destination);
                    handleDestinationChange(temp);
                  }}
                  className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm hover:shadow flex items-center justify-center text-pink-600 hover:bg-pink-50 hover:scale-105 transition-all focus:outline-none"
                  title="Tukar Asal dan Tujuan"
                >
                  <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
                </button>
              </div>

              {/* Destination District */}
              <div className="flex-1 relative">
                <div className="flex items-center gap-2 mb-2 text-blue-600">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-bold">Kecamatan Tujuan</span>
                </div>
                <SearchableDistrictSelect
                  label=""
                  value={destination?.name || ""}
                  onChange={handleDestinationChange}
                  placeholder=""
                />
              </div>
            </div>

            {/* Weight Input */}
            <div className="mb-6 relative z-10">
              <div className="flex items-center gap-2 mb-2 text-gray-800">
                <Package className="w-4 h-4 text-pink-500" />
                <span className="text-sm font-bold">Berat Barang (kg)</span>
              </div>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full sm:w-1/3 h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all outline-none"
              />
            </div>

            {/* ── SECTION KODE PROMO ── */}
            <div className="mb-6 p-4 sm:p-5 bg-gradient-to-br from-pink-50/60 to-purple-50/40 rounded-2xl border border-pink-100/90 relative z-10">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-pink-700">
                  <Tag className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Kode Promo Mitra
                  </span>
                </div>
                {isPromoLoading && (
                  <span className="text-[11px] text-pink-500 flex items-center gap-1 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Mengecek promo...
                  </span>
                )}
              </div>

              {/* Status: Promo Aktif Terpasang */}
              {appliedPromo ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between shadow-2xs animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-extrabold text-emerald-900 uppercase">
                          {appliedPromo.promo_code}
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Aktif
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                        {appliedPromo.promo_name || "Promo Berhasil Diterapkan"}
                        {appliedPromo.discount_amount > 0 && (
                          <span> • Potongan Rp {appliedPromo.discount_amount.toLocaleString("id-ID")}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hapus promo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Manual Input + Quick Buttons */
                <div className="space-y-3">
                  {/* Manual Input Form */}
                  <form onSubmit={handleApplyManualPromo} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder=""
                        value={promoCodeInput}
                        onChange={(e) => {
                          setPromoCodeInput(e.target.value.toUpperCase());
                          setPromoError(null);
                        }}
                        className="w-full h-10 px-3.5 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-800 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none uppercase transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!promoCodeInput.trim() || isLoading}
                      className="h-10 px-4 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-1"
                    >
                      <span>Terapkan</span>
                    </button>
                  </form>

                  {/* Promo Error Message */}
                  {promoError && (
                    <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium bg-red-50 p-2.5 rounded-xl border border-red-100">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{promoError}</span>
                    </div>
                  )}

                  {/* Quick Buttons: Promo Rekomendasi & Tersedia */}
                  {eligiblePromos.length > 0 && (
                    <div className="pt-2 border-t border-pink-100/60">
                      <span className="text-[11px] font-bold text-gray-600 block mb-2">
                        Pilihan Promo Tersedia:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {eligiblePromos.map((p) => {
                          const isRec = p.isRecommended;
                          return (
                            <button
                              key={p.promoCode}
                              type="button"
                              onClick={() => handleQuickApplyPromo(p.promoCode)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs border ${
                                isRec 
                                  ? "bg-pink-600 hover:bg-pink-700 text-white border-pink-600"
                                  : "bg-white hover:bg-pink-50 text-gray-800 border-gray-200 hover:border-pink-200"
                              }`}
                              title={p.promoDescription || p.promoName}
                            >
                              {isRec && <span>⭐</span>}
                              <span className="font-mono uppercase">{p.promoCode}</span>
                              <span className={isRec ? "text-pink-100 font-semibold" : "text-pink-600 font-semibold"}>
                                ({p.discountPercentage}%)
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Calculate Button */}
            <button
              type="button"
              onClick={() => handleCheckRates()}
              disabled={isLoading || !origin || !destination || !weight}
              className="w-full relative z-10 flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-4 focus:ring-pink-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Menghitung Tarif & Promo...</span>
                </>
              ) : (
                <>
                  <Calculator className="w-5 h-5" />
                  <span>Cek Tarif Pengiriman</span>
                </>
              )}
            </button>
          </div>

          {/* General Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-red-800">Gagal Memuat Tarif</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* ── SECTION HASIL TARIF ── */}
          {rates.length > 0 && (
            <div className="space-y-4 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Hasil Cek Ongkir</h3>
                  <p className="text-xs text-gray-500">
                    {origin?.name} → {destination?.name} ({weight} kg)
                  </p>
                </div>
                {appliedPromo && (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold w-fit">
                    Diskon Promo Aktif
                  </span>
                )}
              </div>

              {rates.map((rate, index) => {
                const normalPrice = rate.delivery_price;
                const promoData = rate.applied_promo || (appliedPromo ? {
                  promo_code: appliedPromo.promo_code,
                  promo_name: appliedPromo.promo_name,
                  discount_amount: appliedPromo.discount_amount,
                  final_price: appliedPromo.final_price,
                } : null);

                const hasDiscount = promoData && promoData.discount_amount > 0;
                const finalPrice = hasDiscount ? promoData.final_price : normalPrice;
                const discountAmount = hasDiscount ? promoData.discount_amount : 0;

                return (
                  <div 
                    key={index} 
                    className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      hasDiscount ? "border-emerald-200 hover:border-emerald-300" : "border-gray-100 hover:border-pink-200"
                    }`}
                  >
                    {/* Left: Service Information */}
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-bold text-pink-600 bg-pink-50 border border-pink-100 px-2.5 py-0.5 rounded-lg">
                          {rate.product_code}
                        </span>
                        <h4 className="font-bold text-gray-900 text-base">{rate.product_name}</h4>
                      </div>
                      <p className="text-xs text-gray-500">Estimasi Pengiriman: {rate.duration}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Berat tertagih: {rate.weight} kg</p>
                    </div>

                    {/* Right: Pricing Breakdown */}
                    <div className="text-left sm:text-right flex flex-col sm:items-end justify-center">
                      {hasDiscount ? (
                        <>
                          <div className="flex items-center gap-2 sm:justify-end mb-1 flex-wrap">
                            <span className="text-xs text-gray-400 line-through">
                              Rp {normalPrice.toLocaleString("id-ID")}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 text-[11px] font-bold border border-pink-100">
                              <Tag className="w-3 h-3" />
                              {promoData.promo_code}
                            </span>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              - Rp {discountAmount.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-gray-400 block mb-0.5">
                            Total Tarif Setelah Diskon
                          </span>
                          <span className="text-2xl sm:text-3xl font-black text-emerald-600">
                            Rp {finalPrice.toLocaleString("id-ID")}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[11px] font-semibold text-gray-400 block mb-0.5">
                            Total Tarif Normal
                          </span>
                          <span className="text-2xl sm:text-3xl font-black text-gray-900">
                            Rp {normalPrice.toLocaleString("id-ID")}
                          </span>
                          {/* Inline suggestion if not yet applied */}
                          {rate.recommended_promo && (
                            <button
                              type="button"
                              onClick={() => {
                                if (rate.recommended_promo) {
                                  handleQuickApplyPromo(rate.recommended_promo.promoCode);
                                }
                              }}
                              className="mt-2 text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1 transition-colors group"
                            >
                              <span>Gunakan {rate.recommended_promo.promoCode} (Hemat Rp {rate.recommended_promo.finalDiscount.toLocaleString("id-ID")})</span>
                              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

